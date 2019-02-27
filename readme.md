# arc-data-server

An http interface for exported json-files from [BigPaua's Arc App](https://www.bigpaua.com/arcapp/privacy).

The json-exports are accessed and staged through multiple layers:

1. iCloud Directory (if available)
1. Exported (and extracted) json files
1. Enriched Data (details to follow)

The intention is to provide a base for further analysis of the data.

## Configuration
* Directory paths in `App.ts` (to be outsourced somewhere else)
* `config/locationtypes.json` This file is used for determining workplaces and home locations (in order to analyse commutes). It references Arc places by the `place.name` attribute.

## Endpoints
* [`/layer1/files`](http://localhost:3000/layer1/files) Lists all filenames on Layer 1
* [`/layer2/files`](http://localhost:3000/layer2/files) Lists all filenames on Layer 2
* [`/layer2/timelinesummary`](http://localhost:3000/layer2/timelinesummary) Lists the day summaries (Date, from -> to) for all Layer 2 files
* [`/locationtypes`](http://localhost:3000/locationtypes) Shows the place classifications maintained in `config/locationtypes.json`. 

## Commands
### Installation
`npm install`

### Run in Devmode
`npm run dev`