/// <reference path="BasicElements" />
/// <reference path="Buttons" />
/// <reference path="Modal" />
/// <reference path="Color" />
/// <reference path="Brush" />
/// <reference path="Board" />
/// <reference path="TimeLine" />
/// <reference path="../Drawing/IDrawingStrategy" />
/// <reference path="../Helpers/HelperFunctions" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UI;
(function (UI) {
    /**
     * This class wraps the whole UI of the recorder.
     */
    var PlayerUI = (function (_super) {
        __extends(PlayerUI, _super);
        /**
         * Create a new instance of Player UI
         * @param	id				Unique ID of this recorder instance
         * @param	localization	List of translated strings
         */
        function PlayerUI(id, localization) {
            _super.call(this, "div", id + "-player");
            this.id = id;
            this.localization = localization;
            /** The time of recording in milliseconds */
            this.time = 0;
            /** Ticking interval */
            this.tickingInterval = 100;
            // prepare the board
            this.board = this.CreateBoard();
            this.AddChild(this.board);
            // prepare the panels
            var controls = new UI.Panel("div", id + "-controls");
            var buttons = this.CreateButtonsPanel();
            controls.AddChildren([buttons]);
            this.AddChild(controls);
            // allow keyboard
        }
        /**
         *
         */
        PlayerUI.prototype.BindKeyboardShortcuts = function () {
            var _this = this;
            var spacebar = 32;
            var leftArrow = 37;
            var rightArrow = 39;
            var skipTime = 5000; // 5 seconds
            window.onkeyup = function (e) {
                switch (e.keyCode) {
                    case spacebar:
                        _this.PlayPause();
                        break;
                    case leftArrow:
                        _this.timeline.SkipTo(_this.time - skipTime);
                        break;
                    case rightArrow:
                        _this.timeline.SkipTo(_this.time + skipTime);
                        break;
                }
            };
        };
        /**
         * Integrate the canvas into the UI elements tree
         */
        PlayerUI.prototype.AcceptCanvas = function (canvas) {
            this.board.AddChild(canvas);
        };
        /**
         * Create the
         */
        PlayerUI.prototype.CreateBoard = function () {
            var board = new UI.Board(this.id + "-board");
            return board;
        };
        /**
         * Create a panel containing the PLAY/PAUSE button and the upload button.
         */
        PlayerUI.prototype.CreateButtonsPanel = function () {
            var buttonsPanel = new UI.Panel("div", this.id + "-pannels");
            this.playPauseButton = new UI.Button(this.localization.Play, this.PlayPause);
            buttonsPanel.AddChildren([this.playPauseButton]);
            return buttonsPanel;
        };
        /**
         * This function is called when the PLAY/PAUSE button is clicked.
         */
        PlayerUI.prototype.PlayPause = function () {
            if (this.isPlaying === true) {
                this.PausePlaying();
            }
            else {
                this.StartPlaying();
            }
        };
        /**
         * Start (or continue) recording
         */
        PlayerUI.prototype.StartPlaying = function () {
            this.isPlaying = true;
            this.playPauseButton.GetHTML().classList.add("ui-playing");
            this.playPauseButton.GetHTML().innerText = this.localization.Pause;
            VideoEvents.trigger(VideoEventType.Start);
            // update time periodically
            this.ticking = setInterval(this.UpdateCurrentTime, this.tickingInterval);
        };
        /**
         * Pause playback
         */
        PlayerUI.prototype.PausePlaying = function () {
            this.isPlaying = false;
            this.playPauseButton.GetHTML().classList.remove("ui-playing");
            this.playPauseButton.GetHTML().innerText = this.localization.Play;
            VideoEvents.trigger(VideoEventType.Pause);
            // do not update the status and timeline while paused
            clearInterval(this.ticking);
        };
        PlayerUI.prototype.CreateTimeLine = function () {
            var timeline = new UI.TimeLine(this.id + "-timeline");
            return timeline;
        };
        PlayerUI.prototype.CreateTimeStatus = function () {
            var status = new UI.Panel("div", this.id + "-timeline");
            var currentTime = new UI.SimpleElement("span", "0:00");
            var slash = new UI.SimpleElement("span", "&nbsp;/&nbsp;");
            var totalTime = new UI.SimpleElement("span", "0:00");
            status.AddChildren([currentTime, slash, totalTime]);
            return status;
        };
        /**
         * @param	time	Current time in seconds
         */
        PlayerUI.prototype.UpdateCurrentTime = function () {
            this.time += this.tickingInterval;
            this.currentTime.GetHTML().textContent = Helpers.millisecondsToString(this.time);
            this.timeline.GetHTML().style.width = this.Length > 0 ? this.time / this.Length + "%" : "0%";
        };
        return PlayerUI;
    })(UI.Panel);
    UI.PlayerUI = PlayerUI;
})(UI || (UI = {}));
//# sourceMappingURL=PlayerUI.js.map