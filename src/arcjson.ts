import fs = require('fs');


// Super-Class for File directories
export class directory {
    layerNo: number
    dirPath: string
    fileList: string[]
    fileNamePattern: string

    constructor(dir: string) {
        this.dirPath = dir;
    }
    getFileList(): string[] {
        return this.fileList;
    }
    readDirectory(): boolean {
        // Reads the directory with the extracted .json files, writes to this.fileList
        //const sourceDir = 'arc-data/1-raw'
        const sourceDir = this.dirPath;

        // Read files of directory
        let files: string[] = fs.readdirSync(sourceDir);

        // Filter for all files with yyyy-mm-dd.json filename format (others are dupes)
        this.fileList = files.filter(file => RegExp(this.fileNamePattern).test(file));

        console.log(`Layer${this.layerNo}Directory/readDirectory() Found ${this.fileList.length} files`);

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
}