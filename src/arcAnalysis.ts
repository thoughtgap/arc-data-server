import { arcTimeline } from "./arcjson";
import { create } from "domain";

/* Class for analysing parsed arc data */

// Analysis functions for multiple arcTimelines (usually passes to functions analysing the single timelines)
export abstract class timelinesAnalysis {
    public static listPlaces(timelines: arcTimeline[], filter): Array<any> {
        let tlFilter = new timelineFilter(filter); // Handover the filter
        filter = undefined;

        // For each timeline, execute listPlaces and then flatten the result
        let timelinesResults = timelines.map(timeline => timelineAnalysis.listPlaces(timeline, tlFilter));
        timelinesResults = flattenArray(timelinesResults);

        // Remove Duplicates
        timelinesResults = timelinesResults.filter(function (item, pos, self) {
            return self.indexOf(item) == pos;
        })
        return timelinesResults;
    }

    public static visitsWithoutPlace(timelines: arcTimeline[], filter): Array<any> {
        let tlFilter = new timelineFilter(filter); // Handover the filter
        filter = undefined;

        // For each timeline, execute visitsWithoutPlace
        let timelinesResults = timelines.map(timeline => timelineAnalysis.visitsWithoutPlace(timeline, tlFilter))
            .filter(arrays => arrays.length > 0); // Remove empty arrays
        return flattenArray(timelinesResults);
    }

    public static listActivityTypes(timelines: arcTimeline[], filter): Array<any> {
        let tlFilter = new timelineFilter(filter); // Handover the filter
        filter = undefined;

        let timelinesResults = timelines.map(timeline => timelineAnalysis.listActivityTypes(timeline, tlFilter))
            .filter(arrays => arrays.length > 0);
        timelinesResults = flattenArray(timelinesResults);

        // Remove Duplicates
        timelinesResults = timelinesResults.filter(function (item, pos, self) {
            return self.indexOf(item) == pos;
        })
        return timelinesResults;
    }

    public static listTimestamps(timelines: arcTimeline[], filter): Array<any> {
        let tlFilter = new timelineFilter(filter); // Handover the filter
        filter = undefined;

        // For each timeline, execute listPlaces and then flatten the result
        let timelinesResults = timelines.map(timeline => timelineAnalysis.listTimestamps(timeline, tlFilter));
        timelinesResults = flattenArray(timelinesResults);
        return timelinesResults;
    }

    public static listTimelineItems(timelines: arcTimeline[], filter): Array<any> {
        let tlFilter = new timelineFilter(filter); // Handover the filter
        filter = undefined;

        // For each timeline, execute listPlaces and then flatten the result
        let timelinesResults = timelines.map(timeline => timelineAnalysis.listTimelineItems(timeline, tlFilter));
        timelinesResults = flattenArray(timelinesResults);
        return timelinesResults;
    }
}

function flattenArray(nestedArr) {
    /* Flattens a nested Array. Used to merge the Analysis results of different timelines.

        Example: 
            [
                [1,2,3] // results from timeline 1
                , [1,2,3] // results from timeline 2
            ]

        => [1,2,3,1,2,3]
    */
    return [].concat(...nestedArr);
}

function displayTime(millisec: number) {
    const normalizeTime = (time: string): string => (time.length === 1) ? time.padStart(2, '0') : time;
   
    let seconds: string = (millisec / 1000).toFixed(0);
    let minutes: string = Math.floor(parseInt(seconds) / 60).toString();
    let hours: string = '';
   
    if (parseInt(minutes) > 59) {
      hours = normalizeTime(Math.floor(parseInt(minutes) / 60).toString());
      minutes = normalizeTime((parseInt(minutes) - (parseInt(hours) * 60)).toString());
    }
    seconds = normalizeTime(Math.floor(parseInt(seconds) % 60).toString());
   
    if (hours !== '') {
       return `${hours}:${minutes}:${seconds}`;
    }
      return `${minutes}:${seconds}`;
   }

// Analysis functions for one arcTimeline
export abstract class timelineAnalysis {
    
    // Creates a list with all the places visited in this timeline
    public static listPlaces(timeline: arcTimeline, tlFilter: timelineFilter): Array<any> {
        
        // Override the type filter if this had been set. Nothing else makes sense
        tlFilter.filterObj.type = ["visits"];

        return this.itemFilter(timeline, tlFilter)
            .filter(timelineItem => timelineItem.place)        // Only the visits with assigned places
            .map(timelineItem => timelineItem.place.name)      // only return the name
            .filter(function (item, pos, self) {               // remove duplicates
                return self.indexOf(item) == pos;
            })
    }

    // Creates a list with all the visits that are not assigned to a place
    public static visitsWithoutPlace(timeline: arcTimeline, tlFilter: timelineFilter): Array<any> {
        //let filter = timelineFilter.create({ type: ["visits"] }); // Only the visits

        // Override the type filter if this had been set. Nothing else makes sense
        tlFilter.filterObj.type = ["visits"];

        return this.itemFilter(timeline, tlFilter)
            .filter(timelineItem => !timelineItem.place)       // Only the visits without assigned place
            .map(timelineItem => {                             // Return only some fields
                return {
                    startDate: timelineItem.startDate,
                    endDate: timelineItem.endDate,
                    streetAddress: timelineItem.streetAddress
                }
            });
    }

    // Creates a list with all the activity types
    public static listActivityTypes(timeline: arcTimeline, timelineFilter: timelineFilter): Array<any> {

        return this.itemFilter(timeline, timelineFilter)
            .filter(timelineItem => timelineItem.activityType) // Only the visits with assigned activity types
            .map(timelineItem => timelineItem.activityType);   // only return the name
    }

    // List all timeline items (e.g. for heatmap display)
    public static listTimestamps(timeline: arcTimeline, timelineFilter: timelineFilter): Array<any> {

        return this.itemFilter(timeline, timelineFilter)
            .map(timelineItem => {                             // Return only some fields
                return {
                    timestamp: timelineItem.startDate.getTime()/1000,
                    keyfigure: (timelineItem.endDate.getTime() - timelineItem.startDate.getTime())/1000
                }
            });
    }

    // List all timeline items (human readable)
    public static listTimelineItems(timeline: arcTimeline, timelineFilter: timelineFilter): Array<any> {

        return this.itemFilter(timeline, timelineFilter)
            .map(timelineItem => {                             // Return only some fields
                return {
                    startDate: timelineItem.startDate,
                    endDate: timelineItem.endDate,
                    duration: displayTime(((new Date()).setTime(timelineItem.endDate.getTime() - timelineItem.startDate.getTime()))),
                    streetAddress: timelineItem.streetAddress,
                }
            });
    }


    static itemFilter(timeline: arcTimeline, tlFilter: timelineFilter = null): Array<any> {
        // Filter-Object
        // let ffilter: filterObj = {
        //     type: ["activities", "visits"],
        //     weekday: ["Mo"], //, "Tu", "We", "Th", "Fr", "Sa", "Su"],
        //     from: new Date("2018-12-01T00:00:00Z"),
        //     to: new Date("2018-12-10T00:00:00Z"),
        //     activityType: ['walking']
        // }

        let filter = tlFilter.filterObj;

        return timeline.timelineItems.filter(timelineItem => {

            // TimelineItem-Type
            if (filter.type.length > 0) {
                if (!filter.type.includes('activities') && !timelineItem.isVisit) {
                    return false; // No need to check other filters if this is a knockout criteria
                }
                if (!filter.type.includes('visits') && timelineItem.isVisit) {
                    return false;
                }
            }

            // Weekday Filter
            if (filter.weekdayBool) {
                if (!filter.weekdayBool[timelineItem.startDate.getDay()] && !filter.weekdayBool[timelineItem.endDate.getDay()]) {
                    return false;
                }
            }

            // Date Interval Filter
            if (filter.from) {
                if (filter.from > timelineItem.startDate || filter.from > timelineItem.startDate) {
                    return false;
                }
            }
            if (filter.to) {
                if (filter.to < timelineItem.startDate || filter.to < timelineItem.startDate) {
                    return false;
                }
            }

            // Activity Type Filter
            if (filter.activityType.length > 0) {
                if (!filter.activityType.includes(timelineItem.activityType)) {
                    return false;
                }
            }

            return true;
        });
    }
}


/* Timeline Filter Format & Object */
type filterType = "activities" | "visits";
type filterWeekdayStr = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

interface filterObj {
    type?: filterType[]
    weekday?: filterWeekdayStr[],
    weekdayBool?: Boolean[],
    from?: Date,
    to?: Date,
    activityType?: String[] // TODO: Restrict to Arc Activity types?
}

class timelineFilter {
    // Parses a raw filter object and cleans it up.
    // The filter object can come from other functions or from URL parameters
    public filterObj: filterObj = {};

    constructor(filter) {
        this.filterObj = {};

        this.create(filter);
    }

    public create(filter): filterObj {
        // Creates a "clean" timelineFilter-Object from the input Object
        let filterObj: filterObj = {};

        filterObj.type = [];
        if (filter.type !== undefined) {
            // Check if input value is already an array, in this case just hand over
            if (Array.isArray(filter.type)) {
                filterObj.type = filter.type;
            }
            // Or a comma-separated String...
            else if (typeof filter.type == "string") {
                filterObj.type = filter.type.split(",");
            }
        }

        // Weekday Filter
        filterObj.weekday = [];
        if (filter.weekday !== undefined) {
            // Check if input value is already an array, in this case just hand over
            if (Array.isArray(filter.weekday)) {
                filterObj.weekday = filter.weekday;
            }
            // Or a comma-separated String...
            else if (typeof filter.weekday == "string") {
                filterObj.weekday = filter.weekday.split(",");
            }
        }
        if (filterObj.weekday.length > 0) {
            // In:  Array of weekday strings (first two letters)
            //      ["Mo","Tu"]
            // Out: Array of booleans that match with the Date.getDay() Index
            //      [false,true,true,false,false,false,false]
            filterObj.weekdayBool = [
                filter.weekday.includes('Su'),
                filter.weekday.includes('Mo'),
                filter.weekday.includes('Tu'),
                filter.weekday.includes('We'),
                filter.weekday.includes('Th'),
                filter.weekday.includes('Fr'),
                filter.weekday.includes('Sa')
            ];
        }

        if (filter.from) {
            filterObj.from = new Date(filter.from);
            // TODO: Error handling
        }

        if (filter.to) {
            filterObj.to = new Date(filter.to);
            // TODO: Error handling
        }

        filterObj.activityType = [];
        if (filter.activityType !== undefined) {
            // Check if input value is already an array, in this case just hand over
            if (Array.isArray(filter.activityType)) {
                filterObj.activityType = filter.activityType;
            }
            // Or a comma-separated String...
            else if (typeof filter.activityType == "string") {
                filterObj.activityType = filter.activityType.split(",");
            }
        }

        this.filterObj = filterObj;
        return filterObj;
    }
}