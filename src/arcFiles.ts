/* Classes for reading the json-files from disk and parsing the data */

import fs = require('fs');
import path = require('path');
import zlib = require('zlib');
import { promisify } from 'util';
import { arcTimeline } from './arcjson';


function traverseDir(dir) {
    return fs.readdirSync(dir).reduce((files, file) => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            const nestedFiles = traverseDir(fullPath);
            return [...files, ...nestedFiles];
        }
        return [...files, fullPath];
    }, []);
}

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

    public status: any;

    constructor(dir: string, loadOnStart: boolean = false, fileNamePattern: string, nextLayerDirPath: string = null, status = null) {
        this.dirPath = dir;
        this.fileNamePattern = fileNamePattern;

        if (nextLayerDirPath) {
            this.nextLayerDirPath = nextLayerDirPath;
        }

        if (status) {
            this.status = status;
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
        let files: string[] = traverseDir(this.dirPath);

        // Filter for all files with yyyy-mm-dd.json filename format (others are dupes)
        this.filenameList = files.filter(file => RegExp(this.fileNamePattern).test(path.basename(file)));

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
            let file = new File(filename, true);

            // Only add files with content, skip empty files
            if (file.fileContent) {
                returnVal.push(file);
            }

            progress.update();
        });
        progress.done();

        this.loadedFileContents = true;
        this.fileContentList = returnVal;
        return true;
    }
}

// Methods for Layer1 => Layer2 file extraction
enum ExtractionMethod {
    SKIP = 1,
    COPY,
    EXTRACT,
}

// Interface for Layer1 => Layer2 extraction
interface FileExtraction {
    method:ExtractionMethod;
    error?:Error;
}

// Layer 1: iCloud Drive Directory
// not implemented yet!
export class Layer1Directory extends directory {

    constructor(dir: string, loadOnStart: boolean = false, nextLayerDirPath: string) {
        const fileNamePattern = '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?( [0-9]+)?\.json(\([0-9]+\))?(\.gz)?$';

        const status = {
            "extract_timestamp": null,
            "fileCount": {
                source: {
                    original: null,
                    withoutDuplicates: null
                },
                processed: {
                    skipped: null,
                    extracted: null,
                    copied: null
                }
            }
        };

        super(dir, loadOnStart, fileNamePattern, nextLayerDirPath, status);
        this.nextLayerDirPath = nextLayerDirPath; // Needed for extraction        
    }

    public async load() {
        this.readFilenameList();
        let duplicateSummary = this.deduplicateFilenameList();
        let extractSummary = await this.extractFilesToLayer2();

        let summary = {
            "extract_timestamp": new Date(),
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
        this.status = summary; // Persist the status

        if (summary.fileCount.processed.extracted + summary.fileCount.processed.copied > 0) {
            // TODO: Trigger reload of data from Layer2 automatically
            summary["nextStep"] = "Reload Layer2 Data by calling /files/jsonexport/reload manually";
        }

        return summary;
    }

    // Link between Layer 1 and 2: extract files into layer2
    async extractFilesToLayer2() {
        let counter = { skipped: 0, extracted: 0, copied: 0 };
        let mainErrors = [];
        let fileErrors = [];
        
        try {
            //TODO: Configuration checks should be done on app startup
            await this.checkNextLayerDirectory();

            // Initialize progress bar
            let Progress = require('ts-progress');
            let progress = Progress.create({total: this.filenameList.length, pattern: 'Copying/Extracting arc timeline files from iCloud Directory: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} '});

            // Wait for each file to finish synchronously
            for ( let fileName of this.filenameList ) {
                let fileOperation = await this.extractFileToLayer2(fileName);
                
                // Update counter for extraction method used
                if ( fileOperation.method === ExtractionMethod.SKIP ) {
                    counter.skipped += 1;
                }
                else if ( fileOperation.method === ExtractionMethod.COPY ) {
                    counter.copied += 1;
                }
                else if ( fileOperation.method === ExtractionMethod.EXTRACT ) {
                    counter.extracted += 1;
                }

                // Log errors
                if ( fileOperation.error ) {
                    fileErrors.push({
                        fileName: fileName,
                        error: fileOperation.error
                    });
                }

                progress.update();
            }

            progress.done();
        }
        catch (err) {
            mainErrors.push(err);
        }

        
        // Show errors in console
        if ( mainErrors.length > 0 ) {
            console.error('Failed extraction:');
            for ( let e of mainErrors ) {
                console.error(e);
            }
        }
        if ( fileErrors.length > 0 ) {
            console.error('Encoutered errors while processing the following files:');
            for ( let e of fileErrors ) {
                console.error(`${e.fileName} - ${e.error.message}`);
            }
        }

        console.log(`Copied ${counter.copied}, extracted ${counter.extracted} and skipped ${counter.skipped} files.`);

        return counter;
    }

    /**
     * Extracts a single file from Layer 1 to Layer 2. File is either copied, extracted or skipped
     *
     * @private
     * @param {string} fileName
     * @returns {Promise<FileExtraction>} Resolves when process is done. Returns file operation performed and error code if available
     * @memberof Layer1Directory
     */
    private extractFileToLayer2(fileName:string):Promise<FileExtraction> {
        return new Promise(async (res) => {
            let fileOperation:FileExtraction = {
                method: ExtractionMethod.SKIP
            };

            try {
                let sourceFile = fileName;
                // get cleaned.up target filename (only YYYY-MM-DD.json)
                let targetFile = path.join(this.nextLayerDirPath, this.cleanFileName(fileName) + ".json");

                // Try to compare file dates
                try {
                    if ( await this.targetIsNewer(sourceFile, targetFile) ) {
                        // Resolve SKIP when target is newer
                        res(fileOperation)
                    }
                }
                catch(errorOnDateComparison) {
                    // Ignore error since target file may not exist yet
                }
                
                // Check for archive or json to extract or copy
                let extension = fileName.replace(/^.*(\..*)$/, "$1");

                if ( extension === '.json' ) {
                    await this.extractFromSource(ExtractionMethod.COPY, sourceFile, targetFile);
                    fileOperation.method = ExtractionMethod.COPY;
                    res(fileOperation);
                }
                else if ( extension === '.gz' ) {
                    await this.extractFromSource(ExtractionMethod.EXTRACT, sourceFile, targetFile);
                    fileOperation.method = ExtractionMethod.EXTRACT;
                    res(fileOperation);
                }
            }
            catch(err) {
                // Error on copy/extraction
                fileOperation.method = ExtractionMethod.SKIP;
                fileOperation.error = err;
                res(fileOperation);
            }
        });
    }

    /**
     * Checks for the correct configuration of the Layer 2 directory
     *
     * @private
     * @returns {Promise<void>} Promise resolves when configuration is set correctly
     * @memberof Layer1Directory
     */
    private checkNextLayerDirectory():Promise<void> {
        return new Promise((res, rej) => {
            //TODO: Check if it is a directory and if there is write access
            if ( !this.nextLayerDirPath ) {
                rej(new Error('nextLayerDirPath is missing!'));
            }
            res();
        });
    }

    /**
     * Checks if the provided target file is newer than the provided source file
     *
     * @private
     * @param {string} sourceFile path to source file
     * @param {string} targetFile path to target file
     * @returns {Promise<boolean>} the target is newer than the source
     * @memberof Layer1Directory
     */
    private targetIsNewer(sourceFile:string, targetFile:string):Promise<boolean> {
        return new Promise(async (res, rej) => {
            try {
                let sourceFileDate = new Date((await promisify(fs.stat)(sourceFile)).mtime);
                let targetFileDate = new Date((await promisify(fs.stat)(targetFile)).mtime);

                res(targetFileDate >= sourceFileDate);
            }
            catch(err) {
                rej(err);
            }
        });
    }

    /**
    * Attempts to copy or extract .gz/.json source file to a .json target file
    *
    * @private
    * @param {ExtractionMethod} method ExtractionMethod.EXTRACT for .gz extraction or ExtractionMethod.COPY for file copy
    * @param {string} sourceFile source file path
    * @param {string} targetFile target file path
    * @returns {Promise<void>} Promise resolves when extraction was successful
    * @memberof Layer1Directory
    */
    private extractFromSource(method:ExtractionMethod, sourceFile:string, targetFile:string):Promise<void> {
        return new Promise((res, rej) => {
            if ( method === ExtractionMethod.COPY ) {
               fs.copyFile(sourceFile, targetFile, (err) => {
                   if (err) rej(err);
                   res();
               });
            }
            else if ( method === ExtractionMethod.EXTRACT ) {
                let rstream = fs.createReadStream(sourceFile);
                let gunzip = zlib.createGunzip();

                gunzip.on('error', rej);

                let buffer = [];
                gunzip.on('data', (chunk) => {
                    buffer.push(chunk);
                });

                gunzip.on('end', (chunk) => {
                    let wstream = fs.createWriteStream(targetFile);
                    wstream.on('error', rej);
                    wstream.on('finish', res);
                    wstream.on('end', res);
                    for ( let b of buffer ) {
                        wstream.write(b);
                    }
                    wstream.end();
                });

                rstream.pipe(gunzip);

                /*
                    // TODO: Piping gunzip causes errors

                    // The following code would be cleaner since the file
                    // would not be read into a variable but piped directly to targetFile.
                    // However, it causes some errors
                    
                    let rstream = fs.createReadStream(sourceFile);
                    let gunzip = zlib.createGunzip();
                    let wstream = fs.createWriteStream(targetFile);
                    rstream.pipe(gunzip).pipe(wstream);

                    // For some files, the gunzip finish event is not fired.
                    // Some files cause the following gunzip errors:

                    // 2018-05-12.json.gz - incorrect data check
                    // 2018-07-18.json.gz - invalid block type
                    // 2018-07-20.json.gz - invalid block type
                    // 2018-07-21.json.gz - invalid distance code
                    // 2018-07-23.json.gz - invalid block type
                    // 2018-07-26.json.gz - too many length or distance symbols
                    // 2018-07-27.json.gz - invalid block type
                    // 2018-07-28.json.gz - invalid distance code
                    // 2018-07-29.json.gz - invalid block type
                    // 2018-07-30.json.gz - invalid block type
                    // 2018-08-01.json.gz - invalid code lengths set
                    // 2018-08-03.json.gz - invalid block type
                    // 2018-08-04.json.gz - invalid stored block lengths
                    // 2018-08-07.json.gz - invalid block type
                    // 2018-08-08.json.gz - invalid block type
                    // 2018-08-10.json.gz - too many length or distance symbols
                */
            }
            else {
                rej(new Error('Method not allowed'));
            }
        });
    }

    // Cleans up a filename and removes extensions and duplicate indicators
    // e.g. 2015-08-02.json.gz      => 2015-08-02
    //      2019-02-22 1915.json.gz => 2019-02-22
    //      2019-02-22.json(12).gz  => 2019-02-22
    private cleanFileName(filePath: string) {
        const fileName = path.basename(filePath);
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
            let currentFileDate = new Date(fs.statSync(current).mtime);
            let lastFileDate = new Date(fs.statSync(last).mtime);
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

        const status = {
            "fileCount": {
                jsonexports: null,
                parsedTimelines: 0
            }
        }

        super(dir, loadOnStart, fileNamePattern, null, status);
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
            },
            load_timestamp: null
        };

        if (this.parsedArcTimelines) {
            console.log("Timelines were already parsed, content deleted. It doesn't make sense to parse again!");
        }
        else if (this.fileContentList.length == 0) {
            console.log("Timelines cannot be parsed, no files have been read successfully.");
        }
        else {
            var Progress = require('ts-progress');
            var progress = Progress.create({ total: this.filenameList.length, pattern: 'Parsing arc timeline files: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ' });
            for (let i = 0; i < this.fileContentList.length; i++) {
                var fileContent = this.fileContentList[i].fileContent;
                // TODO: error handling
                if (fileContent) {
                    this.arcTimelines.push(new arcTimeline(this.fileContentList[i].fileContent));
                }

                // After parsing the data, the file contents can be deleted to free up memory
                this.fileContentList[i] = null;

                progress.update();
            }
            progress.done();
        }
        this.parsedArcTimelines = true;
        summary.fileCount.parsedTimelines = this.arcTimelines.length;
        summary.load_timestamp = new Date();

        this.status = summary; // Persist the status
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
    fileContent: string

    constructor(fileFullPath: string, json: boolean) {
        this.fileFullPath = fileFullPath;

        //console.log(`Reading ${json ? 'JSON' : ''} file ${this.fileFullPath}`)
        let content = fs.readFileSync(this.fileFullPath, 'utf8');
        if (json && content) {
            // TODO: Error handling (file can be incomplete, JSON.parse might fail)
            try {
                content = JSON.parse(content);
            } catch (e) {
                console.error(`${fileFullPath} - Invalid JSON content`);
                //console.error(e);
            }
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

        this.arcLayer1Dir = config.layer1.directory; 
        this.arcLayer2Dir = config.layer2.directory;
        // TODO: Check if directories really exist (and are directories)
        // TODO: Check for write access in layer2 directory
        this.arcLayer2AutoLoadOnStart = config.layer2.autoLoadOnStart;
        this.configLoaded = true;
        return true;
    }

    getArcLayer1Dir() { return this.arcLayer1Dir; }
    getArcLayer2Dir() { return this.arcLayer2Dir; }
    getArcLayer2AutoLoadOnStart() { return this.arcLayer2AutoLoadOnStart; }
}