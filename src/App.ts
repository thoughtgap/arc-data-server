import * as express from 'express'
import * as arcFiles from './arcFiles'
import * as arcClassification from './arcClassification'
import * as arcAnalysis from './arcAnalysis'

// Central classes
const arcDirConfig = new arcFiles.config();
const arcLayer1Dir = new arcFiles.Layer1Directory(arcDirConfig.getArcLayer1Dir());
const arcLayer2Dir = new arcFiles.Layer2Directory(arcDirConfig.getArcLayer2Dir(),
  arcDirConfig.getArcLayer2AutoLoadOnStart());

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
    router.get("/files/source", (req, res, next) => {
      console.log("/files/source");
      let obj = {
        "description": "A list of all relevant files in the iCloud folder",
        "response": arcLayer1Dir.getFilenameList()
      }
      res.json(obj);
    })

    // List Layer 2 Files
    router.get("/files/jsonexport", (req, res, next) => {
      console.log("/files/jsonexport");

      let obj = {
        "description": "A list of all the Arc json export files.",
        "response": arcLayer2Dir.getFilenameList()
      }
      res.json(obj);
    })

    // router.get("/layer2/timelinesummary", (req, res, next) => {
    //   console.log("/layer2/timelinesummary");
    //   res.json(arcLayer2Dir.listTimelineItems());
    // })

    router.get("/classifications/places", (req, res, next) => {
      console.log("/classifications/places");

      let obj = {
        "description": "The classified places (by place.name) put into the categories",
        "response": arcClassificationPlaces.getClassification()
      }
      res.json(obj);
    })


    router.get("/visits/places/", (req, res, next) => {
      console.log("/visits/places/");

      let filter = req.query; // Fetch the filter from the URL get parameters

      let obj = {
        "description": "A list of all the places that were visited.",
        "response": arcAnalysis.timelinesAnalysis.listPlaces(arcLayer2Dir.getArcTimelines(),filter)
      }
      res.json(obj);
    })


    router.get("/visits/places/unassigned", (req, res, next) => {
      console.log("/visits/places/unassigned");

      let filter = req.query; // Fetch the filter from the URL get parameters

      let obj = {
        "description": "A list of Visits with no assigned place.",
        "response": arcAnalysis.timelinesAnalysis.visitsWithoutPlace(arcLayer2Dir.getArcTimelines(),filter)
      };
      res.json(obj);
    })

    router.get("/activities/types", (req, res, next) => {
      console.log("/activities/types");

      let filter = req.query; // Fetch the filter from the URL get parameters

      let obj = {
        "description": "A list of all activity types",
        "response": arcAnalysis.timelinesAnalysis.listActivityTypes(arcLayer2Dir.getArcTimelines(),filter)
      };
      res.json(obj);
    })


    router.get("/timelineItems/timestamps", (req, res, next) => {
      console.log("/timelineItems/timestamps");

      let filter = req.query; // Fetch the filter from the URL get parameters

      let obj = {
        "description": "A list of all activity types",
        "response": arcAnalysis.timelinesAnalysis.listTimestamps(arcLayer2Dir.getArcTimelines(),filter)
      };

      res.json(obj);
    })

    router.get("/timelineItems/list", (req, res, next) => {
      console.log("URL: "+req.url);

      let filter = req.query; // Fetch the filter from the URL get parameters
      console.log(`Using filter: `+JSON.stringify(filter))
    
      let obj = {
        "description": "A list of timelineItems (filtered)",
        "response": arcAnalysis.timelinesAnalysis.listTimelineItems(arcLayer2Dir.getArcTimelines(),filter)
      };

      res.json(obj);
    })
    this.express.use('/', router)
  }
}

export default new App().express