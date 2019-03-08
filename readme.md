# arc-data-server

An http interface for exported json-files from [BigPaua's Arc App](https://www.bigpaua.com/arcapp/privacy).

The json-exports are accessed and staged through multiple layers:

1. iCloud Directory (if available) with compressed export files (--> Not implemented yet!)
1. Extracted json files for direct read (accepts only `yyyy-mm-dd.json` and `yyyy-mm.json`)
1. Enriched Data (details to follow)

The intention is to provide a base for further analysis of the data.

## Configuration

* `config/directories.json` The paths to the directories are specified here.
  * `layer1`: iCloud directory where Arc stores its daily json.gz outputs
  * `layer2`: Local directory (defaults to `arc-data/jsonexport`), containing uncompressed json files
* `config/locationtypes.json` This file is used for determining workplaces and home locations (in order to analyse commutes). It references Arc places by the `place.name` attribute.

## Endpoints

* [`/files/source`](http://localhost:3000/files/source) Lists the compressed source files (Layer 1, not really implemented yet)
* [`/files/jsonexport`](http://localhost:3000/files/jsonexport) Lists all the Arc export files (Layer 2)
* [`/classifications/places`](http://localhost:3000/classifications/places) Shows the place classifications maintained in `config/locationtypes.json`
* [`/visits/places/`](http://localhost:3000/visits/places) Shows a list of all the places that were visited. Can be filtered.
* [`/visits/places/unassigned`](http://localhost:3000/visits/places/unassigned) Shows a list of visits that don't have an assigned place. Can be filtered.
* [`/activities/types`](http://localhost:3000/activities/types) Shows a list of all activity types. Can be filtered.
* [`/timelineItems/list`](http://localhost:3000/timelineItems/list) Shows a (human-readable) list of timelineItems. Can be filtered.
* [`/timelineItems/timestamps`](http://localhost:3000/timelineItems/timestamps) Shows a list of timestamps. Can be filtered.

### Filtering
You can optionally filter the queried timelineitems with the following URL-Parameters:

* `?type=visits` Shows only visits. Use `?type=activities` for activities
* `&from=2019-03-01` From-Date
* `&to=2019-03-15` To-Date
* `&activityType=cycling,boat` A (comma-separated) list of activity types
* `&weekday=Mo,Fr` A (comma-separated) list of weekdays (first two letters)

## Commands

### Installation

* Install [Node.js](https://nodejs.org/en/).
* cd to this directory
* Install arc-data-server via `npm install`

### Run in Devmode

* `npm run dev`

## Notes

1. The current version of arc-data-server reads uncompressed Arc json-files from a local directory (`layer2` in `config/directories.json`). To get started, extract the Arc YYYY-MM-DD.json.gz files to that location.
2. arc-data-server does not currently monitor changes to the input files, to reload, restart the server.