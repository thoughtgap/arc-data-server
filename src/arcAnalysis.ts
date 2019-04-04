import { arcTimeline } from "./arcjson";
import { Places } from "./arcClassification";
import { create } from "domain";

/* Class for analysing parsed arc data */

// Analysis functions for multiple arcTimelines (usually passes to functions analysing the single timelines)
export abstract class timelinesAnalysis {
    public static listPlaces(timelines: arcTimeline[], filter, classificationPlaces: Places): Array<any> {
        let tlFilter = new timelineFilter(filter, classificationPlaces); // Handover the filter
        filter = undefined;

        // For each timeline, execute listPlaces and then flatten the result
        let timelinesResults = timelines.map(timeline => singleTimelineAnalysis.listPlaces(timeline, tlFilter));
        timelinesResults = flattenArray(timelinesResults);

        // Remove Duplicates
        timelinesResults = timelinesResults.filter(function (item, pos, self) {
            return self.indexOf(item) == pos;
        })
        return timelinesResults;
    }

    public static visitsWithoutPlace(timelines: arcTimeline[], filter, classificationPlaces: Places): Array<any> {
        let tlFilter = new timelineFilter(filter, classificationPlaces); // Handover the filter
        filter = undefined;

        // For each timeline, execute visitsWithoutPlace
        let timelinesResults = timelines.map(timeline => singleTimelineAnalysis.visitsWithoutPlace(timeline, tlFilter))
            .filter(arrays => arrays.length > 0); // Remove empty arrays
        return flattenArray(timelinesResults);
    }

    public static listActivityTypes(timelines: arcTimeline[], filter, classificationPlaces: Places): Array<any> {
        let tlFilter = new timelineFilter(filter, classificationPlaces); // Handover the filter
        filter = undefined;

        let timelinesResults = timelines.map(timeline => singleTimelineAnalysis.listActivityTypes(timeline, tlFilter))
            .filter(arrays => arrays.length > 0);
        timelinesResults = flattenArray(timelinesResults);

        // Remove Duplicates
        timelinesResults = timelinesResults.filter(function (item, pos, self) {
            return self.indexOf(item) == pos;
        })
        return timelinesResults;
    }

    public static listTimestamps(timelines: arcTimeline[], filter, classificationPlaces: Places): Array<any> {
        let tlFilter = new timelineFilter(filter, classificationPlaces); // Handover the filter
        filter = undefined;

        // For each timeline, execute listPlaces and then flatten the result
        let timelinesResults = timelines.map(timeline => singleTimelineAnalysis.listTimestamps(timeline, tlFilter));
        timelinesResults = flattenArray(timelinesResults);
        return timelinesResults;
    }

    public static listTimelineItems(timelines: arcTimeline[], filter, classificationPlaces: Places): Array<any> {
        let tlFilter = new timelineFilter(filter, classificationPlaces); // Handover the filter
        filter = undefined;

        // For each timeline, execute listPlaces and then flatten the result
        let timelinesResults = timelines.map(timeline => singleTimelineAnalysis.listTimelineItems(timeline, tlFilter));
        
        timelinesResults = flattenArray(timelinesResults);
        
        // Filter for pagination
        // TODO: Performance could be increased by passing pagination to the single timelines,
        //       so not all timelines have to be parsed all the time. Makes it more complicated though.
        if(tlFilter.filterObj.pagination.limit) {
            timelinesResults = timelinesResults.filter((timelinesResults, i_timelinesResults) => {
                return (i_timelinesResults >= tlFilter.filterObj.pagination.offset
                        && i_timelinesResults < tlFilter.filterObj.pagination.offset + tlFilter.filterObj.pagination.limit);
            });
        }
        
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

function formatDuration(millisec: number) {
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
export abstract class singleTimelineAnalysis {

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

        // Override the type filter if this had been set. Other values don't make sense here.
        tlFilter.filterObj.type = ["visits"];       // Only visits
        tlFilter.filterObj.place.unassigned = true; // Only unassigned places

        return this.itemFilter(timeline, tlFilter)
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
                    timestamp: timelineItem.startDate.getTime() / 1000,
                    keyfigure: (timelineItem.endDate.getTime() - timelineItem.startDate.getTime()) / 1000
                }
            });
    }

    // List all timeline items (human readable)
    public static listTimelineItems(timeline: arcTimeline, timelineFilter: timelineFilter): Array<any> {

        return this.itemFilter(timeline, timelineFilter)
            .map(timelineItem => {                             // Return only some fields

                // Beautification for duration by applying another function
                if (timelineFilter.filterObj.fields.includes("durationHuman")) {
                    let returnObj = timelineItem.getFields(timelineFilter.filterObj.fields);
                    returnObj["durationHuman"] = formatDuration(timelineItem.getDuration())
                    return returnObj;
                }
                else {
                    return timelineItem.getFields(timelineFilter.filterObj.fields);
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

        return timeline.timelineItems.filter((timelineItem, i_timelineItem) => {

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
                if (filter.from > timelineItem.startDate && filter.from > timelineItem.endDate) {
                    return false;
                }
            }
            if (filter.to) {
                if (filter.to < timelineItem.startDate && filter.to < timelineItem.endDate) {
                    return false;
                }
            }

            // Activity Type Filter
            if (filter.activityType.length > 0) {
                if (!filter.activityType.includes(timelineItem.activityType)) {
                    return false;
                }
            }

            // Duration Filter
            if (filter.duration.from && filter.duration.from > timelineItem.getDuration("m")) {
                return false;
            }
            if (filter.duration.to && filter.duration.to < timelineItem.getDuration("m")) {
                return false;
            }

            // Place Filter
            if (filter.place.names.length > 0) {
                if (!timelineItem.place || !filter.place.names.includes(timelineItem.place.name)) {
                    return false;
                }
            }

            // Places - only unassigned
            if (filter.place.unassigned) {
                if (timelineItem.place) { // Only include items without places
                    return false;
                }
            }

            // Route Filter

            // Check previous timelineItem for the desired place(s)
            if (filter.place.from.names.length > 0) {
                if (timeline.timelineItems[i_timelineItem - 1]) {
                    let previous_timelineItem = timeline.timelineItems[i_timelineItem - 1]

                    if (!previous_timelineItem || !previous_timelineItem.place || !filter.place.from.names.includes(previous_timelineItem.place.name)) {
                        return false;
                    }
                }
            }

            // Check next timelineItem for the desired place(s)
            if (filter.place.to.names.length > 0) {
                if (timeline.timelineItems[i_timelineItem + 1]) {
                    let previous_timelineItem = timeline.timelineItems[i_timelineItem + 1]

                    if (!previous_timelineItem || !previous_timelineItem.place || !filter.place.to.names.includes(previous_timelineItem.place.name)) {
                        return false;
                    }
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
    weekdayBool?: boolean[],
    from?: Date,
    to?: Date,
    activityType?: string[] // TODO: Restrict to Arc Activity types?
    duration?: {
        from?: number,
        to?: number
    },
    place?: {
        class?: string,
        names?: string[],
        unassigned?: boolean,
        from?: {
            names?: string[],
            class?: string
        },
        to?: {
            names?: string[],
            class?: string
        }
    },
    fields?: string[],
    pagination?: {
        limit?: number,
        offset?: number
    }
}

class timelineFilter {
    // Parses a raw filter object and cleans it up.
    // The filter object can come from other functions or from URL parameters
    public filterObj: filterObj = {};

    constructor(filter, arcClassificationPlaces) {
        this.filterObj = {};
        this.create(filter, arcClassificationPlaces);
    }

    public create(filter, arcClassificationPlaces): filterObj {
        // Creates a "clean" timelineFilter-Object from the input Object
        let filterObj: filterObj = {};

        filterObj.fields = this.parseArrayOrSeparatedString(filter.fields);
        filterObj.type = this.parseArrayOrSeparatedString(filter.type) as filterType[];


        // Pagination
        filterObj.pagination = {
            limit: null,
            offset: 0
        };
        if (filter.limit && parseInt(filter.limit) != 0) {
            filterObj.pagination.limit = parseInt(filter.limit);
        }
        if (filter.offset) {
            filterObj.pagination.offset = parseInt(filter.offset);
        }
        if (filter.page && parseInt(filter.page) != 0) {
            filterObj.pagination.offset = filterObj.pagination.limit * (parseInt(filter.page) - 1);
        }

        // Weekday Filter
        filterObj.weekday = this.parseArrayOrSeparatedString(filter.weekday) as filterWeekdayStr[];
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

        // Activity Type Filter
        filterObj.activityType = this.parseArrayOrSeparatedString(filter.activityType);

        // Duration Filter &duration_from=60 &duration_to=120
        filterObj.duration = { from: null, to: null };
        if (filter.duration_from !== undefined) {
            // Expect a number in minutes
            let duration_from = parseInt(filter.duration_from);
            if (duration_from != 0) {
                filterObj.duration.from = duration_from;
            }
        }
        if (filter.duration_to !== undefined) {
            // Expect a number in minutes
            let duration_to = parseInt(filter.duration_to);
            if (duration_to != 0) {
                filterObj.duration.to = duration_to;
            }
        }

        // Place Filter
        filterObj.place = {
            class: null,
            names: [],
            unassigned: null,
            from: {
                names: [],
                class: null
            },
            to: {
                names: [],
                class: null
            }
        };

        // &placeClass=home
        if (filter.placeClass !== undefined) {
            filterObj.place.class = filter.placeClass;

            // Resolve the places classification into a PlacesString
            filterObj.place.names.push(...arcClassificationPlaces.getClassification(filter.placeClass));
        }

        // &place=Bakery or &place=Bakery,Café
        if (filter.place !== undefined) {
            filterObj.place.names.push(...this.parseArrayOrSeparatedString(filter.place));
        }

        // &placeUnassigned=1
        if (filter.placeUnassigned !== undefined) {
            filterObj.place.unassigned = true;
        }

        // &placeFromClass=home
        if (filter.placeFromClass !== undefined) {
            filterObj.place.from.class = filter.placeFromClass;

            // Resolve the places classification into a PlacesString
            filterObj.place.from.names.push(...arcClassificationPlaces.getClassification(filterObj.place.from.class)); // Add the array of places to place.names
        }

        // &placeFrom=Bakery or &placeFrom=Bakery,Café
        if (filter.placeFrom !== undefined) {
            filterObj.place.from.names.push(...this.parseArrayOrSeparatedString(filter.placeFrom));
        }

        // &placeToClass=home
        if (filter.placeToClass !== undefined) {
            filterObj.place.to.class = filter.placeToClass;

            // Resolve the places classification into a PlacesString
            filterObj.place.to.names.push(...arcClassificationPlaces.getClassification(filterObj.place.to.class)); // Add the array of places to place.names
        }

        // &placeTo=Bakery or &placeTo=Bakery,Café
        if (filter.placeTo !== undefined) {
            filterObj.place.to.names.push(...this.parseArrayOrSeparatedString(filter.placeTo));
        }


        this.filterObj = filterObj;
        return filterObj;
    }

    // Converts a (comma separated) string to an array, waves through an array
    // Returns at least an empty array if input is invalid
    private parseArrayOrSeparatedString(arrayOrSeparatedString: string | string[]): string[] {
        let returnArr: string[] = [];
        if (arrayOrSeparatedString !== undefined) {
            // Check if input value is already an array, in this case just hand over
            if (Array.isArray(arrayOrSeparatedString)) {
                return arrayOrSeparatedString;
            }
            // Or a comma-separated String...
            else if (typeof arrayOrSeparatedString == "string") {
                returnArr = arrayOrSeparatedString.split(",");
            }
        }
        return returnArr;
    }
}