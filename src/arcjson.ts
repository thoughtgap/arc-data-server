import fs = require('fs');

// Super-Class for File directories
export class directory {
    layerNo: number
    dirPath: string

    filenameList: string[]
    loadedFilenameList = false;

    fileNamePattern: string

    fileContentList: File[]
    loadedFileContents = false;


    constructor(dir: string) {
        this.dirPath = dir;
    }
    getFilenameList(): string[] {
        if (!this.loadedFilenameList) {
            this.readFilenameList();
        }
        return this.filenameList;
    }
    readFilenameList(): boolean {
        // Scans the directory with the extracted .json files,
        // writes the filenames to this.filenameList

        // Read files of directory
        let files: string[] = fs.readdirSync(this.dirPath);

        // Filter for all files with yyyy-mm-dd.json filename format (others are dupes)
        this.filenameList = files.filter(file => RegExp(this.fileNamePattern).test(file));

        this.loadedFilenameList = true;
        console.log(`Layer${this.layerNo}Directory/readFilenameList() Found ${this.filenameList.length} files`);
        return true;
    }

    readFiles(): boolean {
        // Reads the files from disk, writes content into this.fileContentList
        if (!this.loadedFilenameList) {
            this.readFilenameList();
        }

        let returnVal: File[] = []; // Temporary Output Variable

        var Progress = require('ts-progress');
        var progress = Progress.create({ total: this.filenameList.length, pattern: 'Reading files from directory: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ' });

        this.filenameList.forEach((filename, i_file) => {
            let file = new File(this.dirPath + "/" + filename, true);
            returnVal.push(file);
            progress.update();
        });
        progress.done();

        this.loadedFileContents = true;
        this.fileContentList = returnVal;
        return true;
    }
}

// Layer 1: iCloud Drive Directory
export class Layer1Directory extends directory {
    constructor(dir: string) {
        super(dir);
        this.fileNamePattern = '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.json(\.gz)?$';
    }

    // !TODO Link between Layer 1 and 2: extract files into layer2
}

// Layer 2: Extracted Files from layer 1
export class Layer2Directory extends directory {
    constructor(dir: string) {
        super(dir);
        this.fileNamePattern = '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$';
    }

    listTimelineItems() {
        if (!this.loadedFileContents) {
            this.readFiles();
        }

        let returnVal = [];
        this.fileContentList.forEach((filecontent, i_filecontent) => {
            let jsonday = new JSONDay(filecontent);
            let fromToSummary = jsonday.fromToSummary();

            // Get only the sentences    from this array of summaries
            let summaryStrings = fromToSummary.map(function (x) {
                return x.sentence;
            });

            returnVal.push({ "day": jsonday.getDate(), "summary": summaryStrings });
        });
        return returnVal;
    }
}

// File
export class File {
    fileFullPath: string
    fileContent

    constructor(fileFullPath: string, json: boolean) {
        this.fileFullPath = fileFullPath;

        //console.log(`Reading ${json ? 'JSON' : ''} file ${this.fileFullPath}`)
        let content = fs.readFileSync(this.fileFullPath, 'utf8');
        if (json) {
            content = JSON.parse(content);
        }
        this.fileContent = content;
    }
}

// For Places classification
export class Places {
    locationTypes: object

    readLocationTypes(): boolean {
        // Read manual assignment of locations to categories like home, work from file
        let file = new File("config/locationtypes.json", true);
        this.locationTypes = file.fileContent;
        return true;
    }
}

// A full JSON-exported day with Arc data
export class JSONDay {
    file: File

    constructor(file: File) {
        this.file = file;
    }

    // Gets the date from this daily Json file
    getDate(): Date {
        // Use end date, because startDate might start yesterday 
        let arcJSONDay = this.file.fileContent;
        return new Date(arcJSONDay.timelineItems[0].endDate.substring(0, 10));
    }

    // Creates an Object with summary of all from -> to (via activity types) segments
    fromToSummary(): Array<any> {
        let arcJSONDay = this.file.fileContent;

        let summary: Array<any> = [];

        // Doing this wild stuff to avoid Javascript Reference problems. Might come back here.
        let summaryObjFrom = null;
        let summaryObjTo = null;
        let summaryObjHow = [];
        let summaryObjSentence = "";

        arcJSONDay.timelineItems.forEach((timelineItem, i_timelineItem) => {
            if (timelineItem.isVisit) {
                // This is a movement segment. Let's see from where to where

                if (summaryObjFrom === null) {
                    // First Element, initialize
                    summaryObjFrom = { timelineItem, i_timelineItem };
                    summaryObjTo = null;
                }
                else {
                    // Arrived somewhere, 
                    summaryObjTo = { timelineItem, i_timelineItem };

                    // Fill in array if empty
                    if (summaryObjHow.length <= 0) {
                        summaryObjHow.push("??");
                    }

                    // Create Summary String
                    summaryObjSentence = `${summaryObjFrom.timelineItem.endDate} - From ${(summaryObjFrom.timelineItem.place ? summaryObjFrom.timelineItem.place.name : '')} (via ${summaryObjHow.join(",")}) to ${(summaryObjTo.timelineItem.place ? summaryObjTo.timelineItem.place.name : '???')}`;

                    // Push to list of summaries
                    summary.push({
                        from: summaryObjFrom
                        , to: summaryObjTo
                        , how: summaryObjHow
                        , sentence: summaryObjSentence
                    });

                    // Reset Variables
                    summaryObjFrom = summaryObjTo;
                    summaryObjHow = [];
                }
            }
            else {
                // This is a transport segment. Fill the Activity type.
                if (timelineItem.activityType) {
                    summaryObjHow.push(timelineItem.activityType);
                }
            }
        });

        return summary;
    }

}