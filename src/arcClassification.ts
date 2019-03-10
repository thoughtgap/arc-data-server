/* Local classification of Arc Data (additional input for analysis) */

import fs = require('fs');
import * as arcFiles from './arcFiles'

// For Places classification
export class Places {
    public classification: object
    classificationLoaded:boolean = false

    loadClassification(): boolean {
        let fileFullPathMine = "config/locationtypes.mine.json"; // The locally modified version, prefered
        let fileFullPathGit  = "config/locationtypes.json";          // The github version, fallback
        let fileFullPath = "";

        if (fs.existsSync(fileFullPathMine)) {
            fileFullPath = fileFullPathMine;
        }
        else {
            fileFullPath = fileFullPathGit;
        }
        
        console.log(`Reading JSON file ${fileFullPath}`)
        this.classification = JSON.parse(fs.readFileSync(fileFullPath, 'utf8'));

        this.classificationLoaded = true;
        return true;
    }

    getClassification(): object {
        if(!this.classificationLoaded) {
            this.loadClassification();
        }
        return this.classification;
    }
}