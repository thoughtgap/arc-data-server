import { arcTimeline } from "./arcjson";

/* Class for analysing parsed arc data */

// Analysis functions for multiple arcTimelines (usually passes to functions analysing the single timelines)
export abstract class timelinesAnalysis {
    public static listPlaces(timelines: arcTimeline[]): Array<any> {
        let timelinesResults = timelines.map(timeline => timelineAnalysis.listPlaces(timeline));
        return flattenArray(timelinesResults);
    }

    public static visitsWithoutPlace(timelines: arcTimeline[]): Array<any> {
        let timelinesResults = timelines.map(timeline => timelineAnalysis.visitsWithoutPlace(timeline))
            .filter(arrays => arrays.length > 0);
        return flattenArray(timelinesResults);
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

// Analysis functions for one arcTimeline
export abstract class timelineAnalysis {
    // Creates a list with all the places visited in this timeline (can contain dupes)
    public static listPlaces(timeline: arcTimeline): Array<any> {
        return timeline.onlyVisits()
            .filter(timelineItem => timelineItem.place)    // Only the visits with assigned places
            .map(timelineItem => timelineItem.place.name); // only return the name
    }

    // Creates a list with all the visits that are not assigned to a place
    public static visitsWithoutPlace(timeline: arcTimeline): Array<any> {
        return timeline.onlyVisits()
            .filter(timelineItem => !timelineItem.place) // Only the visits without assigned place
            .map(timelineItem => {  // Return only some info
                return {
                    startDate: timelineItem.startDate,
                    endDate: timelineItem.endDate,
                    streetAddress: timelineItem.streetAddress
                }
            });
    }
}