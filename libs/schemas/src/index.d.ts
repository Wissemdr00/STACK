export declare class TimelineClipSchema {
    image: string;
    text: string;
    duration: number;
}
export declare class TimelineSchema {
    clips: TimelineClipSchema[];
}
export declare const TIMELINE_CONSTRAINTS: {
    readonly MAX_CLIPS: 10;
    readonly MAX_TOTAL_DURATION: 120;
    readonly MAX_TEXT_LENGTH: 200;
    readonly MIN_CLIP_DURATION: 1;
    readonly MAX_CLIP_DURATION: 30;
};
export declare function validateTimelineDuration(clips: TimelineClipSchema[]): boolean;
export declare function validateClipCount(clips: TimelineClipSchema[]): boolean;
