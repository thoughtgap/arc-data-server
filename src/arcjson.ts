/* Data types and structure for exported Arc Data.
The types are useful for scripting, but currently not used for typechecking at runtime
Analysis functionality is added via arcAnalysis module to keep structure + analysis function separated */

import fs = require('fs');

// An Arc-Timeline (can be any length)
export class arcTimeline {
    timelineItems: arcTimelineItem[]

    constructor(arcTimelineJSON) {
        //this.timelineItems = arcTimeline.timelineItems;

        // Parse the raw json items to arcTimelineItem
        this.timelineItems = arcTimelineJSON.timelineItems.map(function (timelineItem) {
            return new arcTimelineItem(timelineItem);
        });
    }

    // Appends the elements of a second Arc timeline (e.g. different file) to this one
    public appendTimeline(arcTimeline: arcTimeline) {
        this.timelineItems.push(...arcTimeline.timelineItems);
    }
}

export class arcTimelineItem {
    itemId: string
    nextItemId: string
    previousItemId: string
    
    startDate: Date
    endDate: Date
    
    samples: arcSample[]
    radius: number
    altitude: number
    center: {
        longitude: number
        latitude: number
    }
    
    activityType: string
    activeEnergyBurned: number
    hkStepCount: number
    stepCount: number
    
    isVisit: boolean
    
    floorsAscended: number
    floorsDescended: number
    
    averageHeartRate: number
    maxHeartRate: number

    /* Visit Fields */
    place:arcPlace
    streetAddress: string
    manualPlace: boolean
    placeId: string

    /* Activity Fields */
    uncertainActivityType: boolean
    manualActivityType: boolean
    activityTypeConfidenceScore: number


    constructor(arcTimelineItem) {
        this.itemId = arcTimelineItem.itemId;
        this.nextItemId = arcTimelineItem.nextItemId;
        this.previousItemId = arcTimelineItem.previousItemId;

        // Parse old timestamp format (pre <09.2018), timestamp from 2001-01-01
        // Convert to unix timestamp from 1970-01-01
        if(typeof arcTimelineItem.startDate == 'number') {
            arcTimelineItem.startDate = (arcTimelineItem.startDate + 978307200).toFixed(0) * 1000;
        }
        if(typeof arcTimelineItem.endDate == 'number') {
            arcTimelineItem.endDate = (arcTimelineItem.endDate + 978307200).toFixed(0) * 1000;
        }

        this.startDate = new Date(arcTimelineItem.startDate);
        this.endDate = new Date(arcTimelineItem.endDate);
        
        this.samples = arcTimelineItem.samples;
        this.radius = arcTimelineItem.radius;
        this.altitude = arcTimelineItem.altitude;
        this.center = arcTimelineItem.center;
        
        this.activityType = arcTimelineItem.activityType;
        this.activeEnergyBurned = arcTimelineItem.activeEnergyBurned;
        this.hkStepCount = arcTimelineItem.hkStepCount;
        this.stepCount = arcTimelineItem.stepCount;
        
        this.isVisit = arcTimelineItem.isVisit;
        
        this.floorsAscended = arcTimelineItem.floorsAscended;
        this.floorsDescended = arcTimelineItem.floorsDescended;
        
        this.averageHeartRate = arcTimelineItem.averageHeartRate;
        this.maxHeartRate = arcTimelineItem.maxHeartRate;

        if(this.isVisit) {
            /* Visit fields */
            this.place = arcTimelineItem.place;
            this.streetAddress = arcTimelineItem.streetAddress;
            this.manualPlace = arcTimelineItem.manualPlace;
            this.placeId = arcTimelineItem.placeId;
        }
        else {
            /* Activity Fields */
            this.uncertainActivityType = arcTimelineItem.uncertainActivityType;
            this.manualActivityType = arcTimelineItem.manualActivityType;
            this.activityTypeConfidenceScore = arcTimelineItem.activityTypeConfidenceScore;
        }
    }

    // Return duration in minutes
    public getDuration(format:String="ms"): number {
        let dur = this.endDate.getTime() - this.startDate.getTime();

        if(format == "ms") {
            return dur;
        }
        else if (format == "s") {
            return dur / 1000; // Seconds
        }
        else if(format == "m") {
            return dur / 1000 / 60; // Minutes
        }
        else if(format == "h") {
            return dur / 1000 / 60 / 60; // Hours
        }
        return dur;
    }
}

interface arcPlace {
    placeId: String,
    radius: {
        mean: number
        sd: number
    }
    isHome: boolean
    name: string
    center: {
        longitude: number
        latitude: number
    }
}

interface arcSample {
    zAcceleration?: number,
    recordingState?: "recording",
    secondsFromGMT?: number // were only added recently
    timelineItemId: string,
    sampleId: string
    location: {
        verticalAccuracy: number
        speed: number
        longitude: number
        horizontalAccuracy: number
        course: number
        latitude: number
        timestamp: Date
        altitude: number
    }
    stepHz: number
    date: Date
    movingState: string, // "stationary
    courseVariance: number
    xyAcceleration: number,
    coreMotionActivityType: string // "walking"
}