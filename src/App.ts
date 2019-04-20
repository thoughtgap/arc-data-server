import * as express from 'express'
import * as arcFiles from './arcFiles'
import * as arcClassification from './arcClassification'
import * as arcAnalysis from './arcAnalysis'

// Central classes
const arcDirConfig = new arcFiles.config();
const arcLayer1Dir = new arcFiles.Layer1Directory(arcDirConfig.getArcLayer1Dir(), false, arcDirConfig.getArcLayer2Dir());
const arcLayer2Dir = new arcFiles.Layer2Directory(arcDirConfig.getArcLayer2Dir(), arcDirConfig.getArcLayer2AutoLoadOnStart());
const arcClassificationPlaces = new arcClassification.Places();

class App {
  public express

  constructor() {
    this.express = express()
    this.mountRoutes()
  }

  private mountRoutes(): void {
    const router = express.Router()

    // Add headers to make the data available from sites hosted elsewhere
    this.express.use(function (req, res, next) {
      console.log("Setting headers");
      res.setHeader('Access-Control-Allow-Origin', '*'); // Website you wish to allow to connect
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // Request methods you wish to allow
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type'); // Request headers you wish to allow
      res.setHeader('Access-Control-Allow-Credentials', true); // Set to true if you need the website to include cookies in the requests
      // sent to the API (e.g. in case you use sessions)
      next(); // Pass to next layer of middleware
    });

    // Just a placeholder
    router.get('/', (req, res) => {
      res.json({ message: 'Hello World!' })
    })

    // List Layer 1 Files
    router.get("/files/source/list", (req, res, next) => {
      console.log("URL: " + req.url);
      let obj = {
        "description": "A list of all relevant files in the iCloud folder",
        "response": arcLayer1Dir.getFilenameList()
      }
      res.json(obj);
    })

    // Extract from Layer 1 (iCloud) to Layer 2
    router.get("/files/extract", async (req, res, next) => {
      console.log("URL: " + req.url);
      let obj = {
        "description": "Copy/Extract the files from iCloud folder to Layer2-Folder",
        "response": await arcLayer1Dir.load()
      }
      res.json(obj);
    })

    // Extract from Layer 1 (iCloud) to Layer 2
    router.get("/files/status", (req, res, next) => {
      console.log("URL: " + req.url);
      let obj = {
        "description": "Status of Layer 1 and 2 files",
        "response": {
          "layer1": arcLayer1Dir.status,
          "layer2": arcLayer2Dir.status,
          "classifications": arcClassificationPlaces.status
        }
      }
      res.json(obj);
    })

    // List Layer 2 Files
    router.get("/files/jsonexport/list", (req, res, next) => {
      console.log("URL: " + req.url);

      let obj = {
        "description": "A list of all the Arc json export files.",
        "response": arcLayer2Dir.getFilenameList()
      }
      res.json(obj);
    })

    // Reload Layer 2 Files
    router.get("/files/jsonexport/reload", (req, res, next) => {
      console.log("URL: " + req.url);

      let obj = {
        "description": "Reloads all layer2 files from disk and parses them (might take a while)",
        "response": arcLayer2Dir.reload() // TODO: Release memory from arc timeline items
      }
      res.json(obj);
    })

    // router.get("/layer2/timelinesummary", (req, res, next) => {
    //   console.log("/layer2/timelinesummary");
    //   res.json(arcLayer2Dir.listTimelineItems());
    // })

    router.get("/classifications/places", (req, res, next) => {
      console.log("URL: " + req.url);

      let obj = {
        "description": "The classified places (by place.name) put into the categories",
        "response": arcClassificationPlaces.getClassifications()
      }
      res.json(obj);
    })

    router.get("/classifications/reload", (req, res, next) => {
      console.log("URL: " + req.url);

      let obj = {
        "description": "The classified places (by place.name) put into the categories",
        "response": arcClassificationPlaces.getClassifications(true)
      }
      res.json(obj);
    })


    router.get("/visits/places/", (req, res, next) => {
      console.log("URL: " + req.url);

      let filter = req.query; // Fetch the filter from the URL get parameters
      console.log(`Using filter: ` + JSON.stringify(filter))

      let obj = {
        "description": "A list of all the places that were visited.",
        "response": arcAnalysis.timelinesAnalysis.listPlaces(arcLayer2Dir.getArcTimelines(), filter, arcClassificationPlaces)
      }
      res.json(obj);
    })


    router.get("/visits/places/unassigned", (req, res, next) => {
      console.log("URL: " + req.url);

      let filter = req.query; // Fetch the filter from the URL get parameters
      console.log(`Using filter: ` + JSON.stringify(filter))

      let obj = {
        "description": "A list of Visits with no assigned place.",
        "response": arcAnalysis.timelinesAnalysis.visitsWithoutPlace(arcLayer2Dir.getArcTimelines(), filter, arcClassificationPlaces)
      };
      res.json(obj);
    })

    router.get("/activities/types", (req, res, next) => {
      console.log("URL: " + req.url);

      let filter = req.query; // Fetch the filter from the URL get parameters
      console.log(`Using filter: ` + JSON.stringify(filter))

      let obj = {
        "description": "A list of all activity types",
        "response": arcAnalysis.timelinesAnalysis.listActivityTypes(arcLayer2Dir.getArcTimelines(), filter, arcClassificationPlaces)
      };
      res.json(obj);
    })


    router.get("/timelineItems/timestamps", (req, res, next) => {
      console.log("URL: " + req.url);

      let filter = req.query; // Fetch the filter from the URL get parameters
      console.log(`Using filter: ` + JSON.stringify(filter))

      let obj = {
        "description": "A list of timestamps (filtered)",
        "response": arcAnalysis.timelinesAnalysis.listTimestamps(arcLayer2Dir.getArcTimelines(), filter, arcClassificationPlaces)
      };

      res.json(obj);
    })

    router.get("/timelineItems/list", (req, res, next) => {
      console.log("URL: " + req.url);

      let filter = req.query; // Fetch the filter from the URL get parameters
      console.log(`Using filter: ` + JSON.stringify(filter))

      let obj = {
        "description": "A list of timelineItems (filtered)",
        "response": arcAnalysis.timelinesAnalysis.listTimelineItems(arcLayer2Dir.getArcTimelines(), filter, arcClassificationPlaces)
      };

      res.json(obj);
    })
    this.express.use('/', router)
  }
}

export default new App().express