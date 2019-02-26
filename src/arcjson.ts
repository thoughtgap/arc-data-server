import fs = require('fs');

// Layer 2: extrahierte Dateien aus Layer 1
export class Layer2Directory {
    dirPath: string
    fileList: string[]

    constructor (dir: string) {
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
        this.fileList = files.filter(file => RegExp('[0-9]{4}-[0-9]{2}-[0-9]{2}\.json').test(file));

        console.log(`Layer2Directory/readDirectory() Found ${this.fileList.length} files`);

        return true;
    }
}