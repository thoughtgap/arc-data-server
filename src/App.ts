import * as express from 'express'

class App {
  public express

  constructor () {
    this.express = express()
    this.mountRoutes()
  }

  private mountRoutes (): void {
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
      res.json({message: 'Hello World!'})
    })

    this.express.use('/', router)
  }
}

export default new App().express