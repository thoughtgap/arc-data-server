/* Classes for reading the json-files from disk and parsing the data */

import fs = require('fs');
import { arcTimeline } from './arcjson';

// Superclass for file directories
export class directory {
    layerNo: number
    dirPath: string

    filenameList: string[]
    loadedFilenameList = false;

    fileNamePattern: string

    fileContentList: File[]
    loadedFileContents = false;


    constructor(dir: string, loadOnStart: boolean = false, fileNamePattern: string) {
        this.dirPath = dir;
        this.fileNamePattern = fileNamePattern;

        if (loadOnStart) {
            console.log("Reading files on Startup");
            this.readFiles();
        }
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
// not implemented yet!
export class Layer1Directory extends directory {
    constructor(dir: string, loadOnStart: boolean = false) {
        const fileNamePattern = '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.json(\.gz)?$';
        super(dir, loadOnStart, fileNamePattern);
    }

    // TODO: Link between Layer 1 and 2: extract files into layer2
}

// Layer 2: Extracted Files from layer 1
export class Layer2Directory extends directory {
    arcTimelines: arcTimeline[]
    parsedArcTimelines: boolean

    constructor(dir: string, loadOnStart: boolean = false) {
        const fileNamePattern = '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?\.json$';

        super(dir, loadOnStart, fileNamePattern);

        this.parsedArcTimelines = false;
        this.arcTimelines = [];
        if(loadOnStart) {
            this.parseFilesToArcTimeline();
        }
    }

    // Parse file Contents to Arc Timeline Data then delete the raw content to free up memory
    parseFilesToArcTimeline() {
        if (!this.loadedFileContents) {
            this.readFiles();
        }

        if (this.parsedArcTimelines && this.fileContentList.length == 0) {
            console.log("Timelines were already parsed, content deleted. It doesn't make sense to parse again!");
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
            this.parsedArcTimelines = true;
        }
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
    configFileGit  = "config/directories.json"

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

        this.arcLayer1Dir = config.layer1.directory;
        this.arcLayer2Dir = config.layer2.directory;
        this.arcLayer2AutoLoadOnStart = config.layer2.autoLoadOnStart;
        this.configLoaded = true;
        return true;
    }

    getArcLayer1Dir() { return this.arcLayer1Dir; }
    getArcLayer2Dir() { return this.arcLayer2Dir; }
    getArcLayer2AutoLoadOnStart() { return this.arcLayer2AutoLoadOnStart; }
}