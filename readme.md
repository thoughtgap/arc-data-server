# arc-data-server

An http interface for exported json-files from [BigPaua's Arc App](https://www.bigpaua.com/arcapp/privacy).

The json-exports are accessed and staged through multiple layers:

1. iCloud Directory (if available) with compressed export files (--> Not implemented yet!)
1. Extracted json files for direct read (accepts only `yyyy-mm-dd.json` and `yyyy-mm.json`)
1. Enriched Data (details to follow)

The intention is to provide a base for further analysis of the data.

## Configuration
* `config/directories.json` The paths to the directories are specified here.
* `config/locationtypes.json` This file is used for determining workplaces and home locations (in order to analyse commutes). It references Arc places by the `place.name` attribute.

## Endpoints
* [`/files/source`](http://localhost:3000/files/source) Lists the compressed source files (Layer 1, not really implemented yet)
* [`/files/jsonexport`](http://localhost:3000/files/jsonexport) Lists all the Arc export files (Layer 2)
* [`/classifications/places`](http://localhost:3000/classifications/places) Shows the place classifications maintained in `config/locationtypes.json`
* [`/visits/places/`](http://localhost:3000/visits/places) Shows a list of all the places that were visited (might contain duplicates, it's just a dumb list)
* [`/visits/places/unassigned`](http://localhost:3000/visits/places/unassigned) Shows a list of visits that don't have an assigned place.

## Commands
### Installation
Install [Node.js](https://nodejs.org/en/).

Then cd to this directory and install via

`npm install`

### Run in Devmode
`npm run dev`