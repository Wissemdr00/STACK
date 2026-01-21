"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMELINE_CONSTRAINTS = exports.TimelineSchema = exports.TimelineClipSchema = void 0;
exports.validateTimelineDuration = validateTimelineDuration;
exports.validateClipCount = validateClipCount;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class TimelineClipSchema {
}
exports.TimelineClipSchema = TimelineClipSchema;
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'Image must be a valid URL' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Image URL is required' }),
    __metadata("design:type", String)
], TimelineClipSchema.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Text must be a string' }),
    (0, class_validator_1.MaxLength)(200, { message: 'Text must not exceed 200 characters' }),
    __metadata("design:type", String)
], TimelineClipSchema.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Duration must be a number' }),
    (0, class_validator_1.Min)(1, { message: 'Duration must be at least 1 second' }),
    (0, class_validator_1.Max)(30, { message: 'Duration must not exceed 30 seconds per clip' }),
    __metadata("design:type", Number)
], TimelineClipSchema.prototype, "duration", void 0);
class TimelineSchema {
}
exports.TimelineSchema = TimelineSchema;
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Clips must be an array' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one clip is required' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TimelineClipSchema),
    __metadata("design:type", Array)
], TimelineSchema.prototype, "clips", void 0);
exports.TIMELINE_CONSTRAINTS = {
    MAX_CLIPS: 10,
    MAX_TOTAL_DURATION: 120,
    MAX_TEXT_LENGTH: 200,
    MIN_CLIP_DURATION: 1,
    MAX_CLIP_DURATION: 30,
};
function validateTimelineDuration(clips) {
    const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
    return totalDuration <= exports.TIMELINE_CONSTRAINTS.MAX_TOTAL_DURATION;
}
function validateClipCount(clips) {
    return clips.length <= exports.TIMELINE_CONSTRAINTS.MAX_CLIPS;
}
//# sourceMappingURL=index.js.map