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
    itemId: String
    nextItemId: String
    previousItemId: String
    
    startDate: Date
    endDate: Date
    
    samples: arcSample[]
    radius: Number
    altitude: Number
    center: Number
    
    activityType: String
    activeEnergyBurned: Number
    hkStepCount: Number
    stepCount: Number
    
    isVisit: boolean
    
    floorsAscended: Number
    floorsDescended: Number
    
    averageHeartRate: Number
    maxHeartRate: Number

    /* Visit Fields */
    place:arcPlace
    streetAddress: string
    manualPlace: boolean
    placeId: string

    /* Activity Fields */
    uncertainActivityType: boolean
    manualActivityType: boolean
    activityTypeConfidenceScore: Number


    constructor(arcTimelineItem) {
        this.itemId = arcTimelineItem.itemId;
        this.nextItemId = arcTimelineItem.nextItemId;
        this.previousItemId = arcTimelineItem.previousItemId;
        
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
        mean: Number
        sd: Number
    }
    isHome: Boolean
    name: String
    center: {
        longitude: Number
        latitude: Number
    }
}

interface arcSample {
    zAcceleration?: Number,
    recordingState?: "recording",
    secondsFromGMT?: Number // were only added recently
    timelineItemId: String,
    sampleId: String
    location: {
        verticalAccuracy: Number
        speed: Number
        longitude: Number
        horizontalAccuracy: Number
        course: Number
        latitude: Number
        timestamp: Date
        altitude: Number
    }
    stepHz: Number
    date: Date
    movingState: String, // "stationary
    courseVariance: Number
    xyAcceleration: Number,
    coreMotionActivityType: String // "walking"
}