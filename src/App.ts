import * as express from 'express'
import * as arcjson from './arcjson'

// Directory Path config
const arcLayer1Path: string = "/Users/more/Library/Mobile\ Documents/iCloud\~com\~bigpaua\~LearnerCoacher/Documents/Export/JSON";
const arcLayer2loadOnStart = true;
const arcLayer2Path: string = "arc-data/2-raw";

// Central classes
const arcLayer1Dir = new arcjson.Layer1Directory(arcLayer1Path);
const arcLayer2Dir = new arcjson.Layer2Directory(arcLayer2Path,arcLayer2loadOnStart);

class App {
  public express
  public arcjson

  constructor() {
    this.express = express()
    this.mountRoutes()
  }

  private mountRoutes(): void {
    const router = express.Router()

    // Add headers to make the data available from sites hosted elsewhere
    // (probably a bad idea?)
    this.express.use(function (req, res, next) {
      console.log("Setting headers");

      // Website you wish to allow to connect
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Request methods you wish to allow
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

      // Request headers you wish to allow
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

      // Set to true if you need the website to include cookies in the requests sent
      // to the API (e.g. in case you use sessions)
      res.setHeader('Access-Control-Allow-Credentials', true);

      // Pass to next layer of middleware
      next();
    });

    // Just a placeholder
    router.get('/', (req, res) => {
      res.json({ message: 'Hello World!' })
    })

    // List Layer 1 Files
    router.get("/layer1/files", (req, res, next) => {
      console.log("/layer1/files");
      res.json(arcLayer1Dir.getFilenameList());
    })

    // List Layer 2 Files
    router.get("/layer2/files", (req, res, next) => {
      console.log("/layer2/files");
      res.json(arcLayer2Dir.getFilenameList());
    })

    router.get("/layer2/timelinesummary", (req, res, next) => {
      console.log("/layer2/timelinesummary");
      res.json(arcLayer2Dir.listTimelineItems());
    })

    router.get("/locationtypes", (req, res, next) => {
      console.log("/locationtypes");
      let test = new arcjson.Places;
      test.readLocationTypes();
      res.json(test.locationTypes);
    })

    this.express.use('/', router)
  }
}

export default new App().express