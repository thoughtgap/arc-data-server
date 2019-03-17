/* Classes for reading the json-files from disk and parsing the data */

import fs = require('fs');
import zlib = require('zlib');
import { arcTimeline } from './arcjson';

// Superclass for file directories
export class directory {
    layerNo: number
    dirPath: string
    nextLayerDirPath: string

    filenameList: string[]
    loadedFilenameList = false;

    fileNamePattern: string

    fileContentList: File[]
    loadedFileContents = false;


    constructor(dir: string, loadOnStart: boolean = false, fileNamePattern: string, nextLayerDirPath: string = null) {
        this.dirPath = dir;
        this.fileNamePattern = fileNamePattern;

        if (nextLayerDirPath) {
            this.nextLayerDirPath = nextLayerDirPath;
        }

        if (loadOnStart) {
            console.log("Loading on Startup");
            this.load();
        }
    }

    public load() {
        this.readFiles();
    }

    public reload() {
        this.reset();
        return this.load();
    }

    public reset() {
        // Reset the files (and free up memory)
        this.filenameList = [];
        this.loadedFilenameList = false;
        this.fileContentList = [];
        this.loadedFileContents = false;
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

        if (!fs.existsSync(this.dirPath)) {
            console.log(`Directory ${this.dirPath} not found`);
            return false;
        }
        // Read files of directory
        let files: string[] = fs.readdirSync(this.dirPath);

        // Filter for all files with yyyy-mm-dd.json filename format (others are dupes)
        this.filenameList = files.filter(file => RegExp(this.fileNamePattern).test(file));

        this.loadedFilenameList = true;
        console.log(`${this.dirPath}/readFilenameList() Found ${this.filenameList.length} files`);
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
            let file = new File(this.dirPath + filename, true);
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
// not implemented yet!
export class Layer1Directory extends directory {

    constructor(dir: string, loadOnStart: boolean = false, nextLayerDirPath: string) {
        const fileNamePattern = '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?( [0-9]+)?\.json(\([0-9]+\))?(\.gz)?$';

        super(dir, loadOnStart, fileNamePattern, nextLayerDirPath);
        this.nextLayerDirPath = nextLayerDirPath; // Needed for extraction        
    }

    public load() {
        this.readFilenameList();
        let duplicateSummary = this.deduplicateFilenameList();
        let extractSummary = this.extractFilesToLayer2();

        let summary = {
            "fileCount": {
                source: {
                    original: duplicateSummary.fileCountOriginal,
                    withoutDuplicates: duplicateSummary.fileCountWithoutDuplicates
                },
                processed: {
                    skipped: extractSummary.skipped,
                    extracted: extractSummary.extracted,
                    copied: extractSummary.copied
                }
            }
        }

        if (summary.fileCount.processed.extracted + summary.fileCount.processed.copied > 0) {
            // TODO: Trigger reload of data from Layer2 automatically
            summary["nextStep"] = "Reload Layer2 Data by calling /files/jsonexport/reload manually";
        }
        return summary;
    }

    // Link between Layer 1 and 2: extract files into layer2
    extractFilesToLayer2() {
        let counter = { skipped: 0, extracted: 0, copied: 0 };

        // Check for layer 2 directory
        if (!this.nextLayerDirPath) {
            console.error("Cannot start extraction, nextLayerDirPath is missing!");
            counter["error"] = "Cannot start extraction, nextLayerDirPath is missing!";
            return counter
        }

        let Progress = require('ts-progress');
        let progress = Progress.create({ total: this.filenameList.length, pattern: 'Copying/Extracting arc timeline files from iCloud Directory: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ' });

        this.filenameList.forEach(fileName => {

            let sourceFile = this.dirPath + fileName;
            let targetFile = this.nextLayerDirPath + fileName;

            // Check file extension
            let extension = fileName.replace(/^.*(\..*)$/, "$1");

            if (extension == ".gz") {
                targetFile = targetFile.slice(0, -3); // Remove the .gz
            }


            // TODO: Check if file exists with same date in target
            let overwrite = true;

            if (fs.existsSync(targetFile)) {
                let sourceFileDate = new Date(fs.statSync(sourceFile).mtime);
                let targetFileDate = new Date(fs.statSync(targetFile).mtime);

                if (targetFileDate >= sourceFileDate) {
                    overwrite = false;
                    counter.skipped++;
                }
            }

            if (overwrite) {
                if (extension == ".gz") {

                    let gunzip = zlib.createGunzip();
                    let rstream = fs.createReadStream(sourceFile);
                    let wstream = fs.createWriteStream(targetFile);
                    rstream.pipe(gunzip).pipe(wstream);
                    // TODO: Error handling

                    counter.extracted++;
                }
                else if (extension == ".json") {
                    //console.log(`Copy ${sourceFile} to ${targetFile}`);
                    fs.copyFile(sourceFile, targetFile, (err) => {
                        if (err) throw err;
                    });

                    counter.copied++;
                }
            }
            progress.update();
        });
        progress.done();
        console.log(`Copied ${counter.copied}, extracted ${counter.extracted} and skipped ${counter.skipped} files.`)
        return counter;
    }

    // Cleans up a filename and removes extensions and duplicate indicators
    // e.g. 2015-08-02.json.gz      => 2015-08-02
    //      2019-02-22 1915.json.gz => 2019-02-22
    //      2019-02-22.json(12).gz  => 2019-02-22
    private cleanFileName(fileName: string) {
        return fileName.replace(/( [0-9]+)?\.json(\([0-9]+\))?(\.gz)?$/, "");
    }

    // From the complete list of Layer1 files, find the most recent files for each timespan
    // assuming there might be duplicates like "YYYY-MM-DD [0-9]+.json([0-9]+).gz
    private deduplicateFilenameList() {
        let cleanFilenameList: string[] = [];

        // Get an object which summarises all the different files for each cleanFileName
        // Example: {'2019-02-12': [ '2019-02-12 2153.json.gz', '2019-02-12.json.gz' ],
        //           '2019-02-14': [ '2019-02-14.json.gz']}
        let uniqueTimespanFiles = {};
        this.filenameList.map(fileName => {
            // Get the clean filename
            let cleanName = this.cleanFileName(fileName);

            // Initialise if it doesn't exist
            if (!uniqueTimespanFiles[cleanName]) {
                uniqueTimespanFiles[cleanName] = [];
            }
            uniqueTimespanFiles[cleanName].push(fileName); // Put original filename into the array
        });

        // Get only the newest file for each timespan
        Object.keys(uniqueTimespanFiles).forEach(key => {
            // Keep only the newest file from the list
            cleanFilenameList.push(this.youngestFileFromList(uniqueTimespanFiles[key]));
        });

        let summary = {
            fileCountOriginal: this.filenameList.length,
            fileCountWithoutDuplicates: cleanFilenameList.length
        };

        console.log(`Reduced ${summary.fileCountOriginal} files to ${summary.fileCountWithoutDuplicates} relevant files`);
        this.filenameList = cleanFilenameList;
        return summary;
    }

    // Find the most recent file from a list of files contained within the layer directory
    private youngestFileFromList(fileList: string[]): string {
        let youngestFile = fileList.reduce((last, current) => {
            let currentFileDate = new Date(fs.statSync(this.dirPath + current).mtime);
            let lastFileDate = new Date(fs.statSync(this.dirPath + last).mtime);
            return (currentFileDate.getTime() > lastFileDate.getTime()) ? current : last;
        });
        //console.log("youngestFileFromList", fileList, youngestFile);
        return youngestFile;
    }
}

// Layer 2: Extracted Files from layer 1
export class Layer2Directory extends directory {
    arcTimelines: arcTimeline[]
    parsedArcTimelines: boolean

    constructor(dir: string, loadOnStart: boolean = false) {
        const fileNamePattern = '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?\.json$';

        super(dir, loadOnStart, fileNamePattern);
    }

    public load() {
        this.parsedArcTimelines = false;
        this.arcTimelines = [];
        return this.parseFilesToArcTimeline();
    }

    // Reset the files (and free up memory)
    public reset() {
        this.filenameList = [];
        this.loadedFilenameList = false;
        this.fileContentList = [];
        this.loadedFileContents = false;
        this.arcTimelines = [];
        this.parsedArcTimelines = false;
    }

    // Parse file Contents to Arc Timeline Data then delete the raw content to free up memory
    parseFilesToArcTimeline() {
        if (!this.loadedFileContents) {
            this.readFiles();
        }

        let summary = {
            "fileCount": {
                jsonexports: this.fileContentList.length,
                parsedTimelines: 0
            }
        };

        if (this.parsedArcTimelines) {
            console.log("Timelines were already parsed, content deleted. It doesn't make sense to parse again!");
        }
        else if (this.fileContentList.length == 0) {
            console.log("Timelines cannot be parsed, no files have been read.");
        }
        else {
            var Progress = require('ts-progress');
            var progress = Progress.create({ total: this.filenameList.length, pattern: 'Parsing arc timeline files: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ' });
            for (let i = 0; i < this.fileContentList.length; i++) {
                
                // TODO: error handling
                this.arcTimelines.push(new arcTimeline(this.fileContentList[i].fileContent));

                // After parsing the data, the file contents can be deleted to free up memory
                this.fileContentList[i] = null;

                progress.update();
            }
            progress.done();
        }
        this.parsedArcTimelines = true;
        summary.fileCount.parsedTimelines = this.arcTimelines.length;
        return summary;
    }

    getArcTimelines() {
        if (!this.parsedArcTimelines) {
            this.parseFilesToArcTimeline();
        }
        return this.arcTimelines;
    }

    // After parsing the data, the file contents can be deleted to free up memory
    deleteFileContents() {
        this.fileContentList = [];
    }

    // TODO: Method to free up arc timelines in order to free up the memory
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

export class config {
    // Load Directory Paths from config/directories.mine.json or config/directories.json
    arcLayer1Dir: string
    arcLayer2Dir: string
    arcLayer2AutoLoadOnStart: boolean = false

    configFileMine = "config/directories.mine.json"
    configFileGit = "config/directories.json"

    configLoaded: boolean = false

    constructor() {
        this.loadConfig();
    }

    loadConfig(): boolean {
        let fileFullPath: string;
        if (fs.existsSync(this.configFileMine)) {
            fileFullPath = this.configFileMine;
        }
        else {
            fileFullPath = this.configFileGit;
        }

        console.log(`Reading JSON file ${fileFullPath}`)
        let config = JSON.parse(fs.readFileSync(fileFullPath, 'utf8'));

        this.arcLayer1Dir = config.layer1.directory; // TODO: Check if this directory really exists
        this.arcLayer2Dir = config.layer2.directory; // TODO: Check if this directory really exists too
        this.arcLayer2AutoLoadOnStart = config.layer2.autoLoadOnStart;
        this.configLoaded = true;
        return true;
    }

    getArcLayer1Dir() { return this.arcLayer1Dir; }
    getArcLayer2Dir() { return this.arcLayer2Dir; }
    getArcLayer2AutoLoadOnStart() { return this.arcLayer2AutoLoadOnStart; }
}