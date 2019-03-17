# arc-data-server

An http interface for exported json-files from [BigPaua's Arc App](https://www.bigpaua.com/arcapp/privacy).

The json-exports are accessed and staged through multiple layers:

1. iCloud Directory (if available) with compressed export files (--> Not implemented yet!)
1. Extracted json files for direct read (accepts only `yyyy-mm-dd.json` and `yyyy-mm.json`)
1. Enriched Data (details to follow)

The intention is to provide a base for further analysis of the data.

## Configuration

* `config/directories.mine.json` / `config/directories.json` The paths to the directories are specified here.
  * `layer1`: iCloud directory where Arc stores its daily json.gz outputs
  * `layer2`: Local directory (defaults to `arc-data/jsonexport`), containing uncompressed json files
* `config/locationtypes.mine.json` / `config/locationtypes.json` This file is used for determining workplaces and home locations (in order to analyse commutes). It references Arc places by the `place.name` attribute.

To separate standard config file and your own values, you can copy the files from `<configfile>.json` to `<configfile>.mine.json`. The `.mine`-file will be read preferrably. Their changes will not be tracked to Git.

## Endpoints

* [`/files/source`](http://localhost:3000/files/source) Lists the compressed source files (Layer 1, not really implemented yet)
* [`/files/extract`](http://localhost:3000/files/extract) Copies/extracts the files from Layer 1 (iCloud) to Layer 2 (local directory). Checks for duplicates in the iCloud directory on the way. Server has to be restarted afterwards (to be fixed)
* [`/files/jsonexport`](http://localhost:3000/files/jsonexport) Lists all the Arc export files (Layer 2)
* [`/classifications/places`](http://localhost:3000/classifications/places) Shows the place classifications maintained in `config/locationtypes.json`
* [`/visits/places`](http://localhost:3000/visits/places) Shows a list of all the places that were visited. Can be filtered.
* [`/visits/places/unassigned`](http://localhost:3000/visits/places/unassigned) Shows a list of visits that don't have an assigned place. Can be filtered.
* [`/activities/types`](http://localhost:3000/activities/types) Shows a list of all activity types. Can be filtered.
* [`/timelineItems/list`](http://localhost:3000/timelineItems/list) Shows a (human-readable) list of timelineItems. Can be filtered.
* [`/timelineItems/timestamps`](http://localhost:3000/timelineItems/timestamps) Shows a list of timestamps. Can be filtered.

### Filtering

You can optionally filter the queried timelineItems with the following URL-Parameters:

* Item Filters:
  * `type=visits` Shows only visits.
  * `type=activities` Shows only activities.
  * Examples:
    * timelineItem timestamps of type "visit": [`/timelineItems/timestamps?type=visits`](http://localhost:3000/timelineItems/timestamps?type=visits)
* Date Filters:
  * `from=2019-03-01` From-Date
  * `to=2019-03-15` To-Date
  * `weekday=Mo,Fr` A (comma-separated) list of weekdays (first two letters)
  * Examples:
    * All activities on Mondays in Jan 2019: [`/activities/types?from=2019-01-01&to=2019-01-31&weekday=Mo`](http://localhost:3000/activities/types?from=2019-01-01&to=2019-01-31&weekday=Mo)
* Activity Filters:
  * `activityType=cycling,boat` A (comma-separated) list of activity types
  * Examples:
    * Timeline items for all cycling activities: [`/timelineItems/timestamps?activityType=cycling`](http://localhost:3000/timelineItems/timestamps?activityType=cycling)
* Duration Filters:
  * `duration_from=30` Minimum duration in minutes
  * `duration_to=60` Maximum duration in minutes
  * Examples:
    * Timeline items for all cycling activities longer than one hour: [`/timelineItems/list?activityType=cycling&duration_from=60`](http://localhost:3000/timelineItems/list?activityType=cycling&duration_from=60)
* Place Filters:
  * `place=Bakery,Café` A (comma-separated) list of exact match place names
  * `placeClass=home` A place classification, maintained in `config/locationtypes.json`
  * `placeUnassigned=1` Only show items with unassigned place
  * Examples:
    * Timeline items at work locations: [`/timelineItems/list?placeClass=work`](http://localhost:3000/timelineItems/list?placeClass=work)
    * Timeline items at "Mom and Dads": [`/timelineItems/list?place=Mom and Dads`](http://localhost:3000/timelineItems/list?place=Mom and Dads)
    * Visits without assigned place: [`/timelineItems/list?placeUnassigned=1&type=visits`](http://localhost:3000/timelineItems/list?placeUnassigned=1&type=visits), same as [`/visits/places/unassigned`](http://localhost:3000/visits/places/unassigned)
* Route (e.g. commute) Filters
  * `placeFrom=Bakery,Café` A (comma-separated) list of exact match place names
  * `placeFromClass=home` A place classification, maintained in `config/locationtypes.json`
  * `placeTo=Supermarket` A (comma-separated) list of exact match place names
  * `placeToClass=work` A place classification, maintained in `config/locationtypes.json`

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