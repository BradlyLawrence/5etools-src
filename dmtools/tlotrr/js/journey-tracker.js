/**
 * dmtools/tlotrr/js/journey-tracker.js
 * Full Middle-earth Map & Interactive Hex Terrain Editor for LOTR RPG.
 */

import { JOURNEY_EVENTS, escapeHtml } from "./data.js";
import { getParty } from "./char-importer.js";
import { addEyeAwareness } from "./eye-of-mordor.js";

// Map dimensions matching map.png (2552x1648)
const MAP_WIDTH = 2552;
const MAP_HEIGHT = 1648;

// Grid State & Settings (Aligned defaults for map.png)
let hexRadius = 25.3;
let offsetX = 3.5;
let offsetY = 12.5;
let gridOpacity = 0.5;

let isEditMode = false;
let activePaintTool = "border"; // "border", "wild", "dark", "impassable", "perilous", "clear"
let perilousRating = 2; // Default peril rating 1-5
let brushSize = 1; // 1 (single hex), 2 (3 hexes), 3 (7 hexes)
let lastPaintedKey = null;

// Built-in Default Middle-earth Map State & Settings
const DEFAULT_HEXMAP_DATA = {
  "settings": {
    "hexRadius": 25.3,
    "offsetX": 3.5,
    "offsetY": 12.5,
    "gridOpacity": 0.5
  },
  "hexState": {
    "17_7": { "type": "wild", "perilous": 0 },
    "17_8": { "type": "wild", "perilous": 0 },
    "17_9": { "type": "wild", "perilous": 0 },
    "18_10": { "type": "wild", "perilous": 0 },
    "17_11": { "type": "wild", "perilous": 0 },
    "17_12": { "type": "wild", "perilous": 0 },
    "18_12": { "type": "wild", "perilous": 0 },
    "18_13": { "type": "wild", "perilous": 0 },
    "17_13": { "type": "wild", "perilous": 0 },
    "18_14": { "type": "wild", "perilous": 0 },
    "17_15": { "type": "wild", "perilous": 0 },
    "18_15": { "type": "wild", "perilous": 0 },
    "18_16": { "type": "wild", "perilous": 0 },
    "17_16": { "type": "wild", "perilous": 0 },
    "14_12": { "type": "border", "perilous": 0 },
    "13_12": { "type": "border", "perilous": 0 },
    "13_11": { "type": "border", "perilous": 0 },
    "14_10": { "type": "border", "perilous": 0 },
    "13_10": { "type": "border", "perilous": 0 },
    "13_9": { "type": "border", "perilous": 0 },
    "12_11": { "type": "border", "perilous": 0 },
    "11_11": { "type": "border", "perilous": 0 },
    "12_12": { "type": "border", "perilous": 0 },
    "11_12": { "type": "border", "perilous": 0 },
    "11_13": { "type": "border", "perilous": 0 },
    "10_11": { "type": "border", "perilous": 0 },
    "10_12": { "type": "border", "perilous": 0 },
    "10_13": { "type": "border", "perilous": 0 },
    "11_14": { "type": "border", "perilous": 0 },
    "11_15": { "type": "border", "perilous": 0 },
    "12_16": { "type": "border", "perilous": 0 },
    "12_17": { "type": "border", "perilous": 0 },
    "11_17": { "type": "border", "perilous": 0 },
    "11_16": { "type": "border", "perilous": 0 },
    "10_15": { "type": "border", "perilous": 0 },
    "10_14": { "type": "border", "perilous": 0 },
    "9_13": { "type": "border", "perilous": 0 },
    "9_11": { "type": "border", "perilous": 0 },
    "11_10": { "type": "border", "perilous": 0 },
    "12_10": { "type": "border", "perilous": 0 },
    "12_9": { "type": "border", "perilous": 0 },
    "14_8": { "type": "border", "perilous": 0 },
    "14_9": { "type": "border", "perilous": 0 },
    "15_8": { "type": "border", "perilous": 0 },
    "16_8": { "type": "border", "perilous": 0 },
    "15_7": { "type": "border", "perilous": 0 },
    "16_7": { "type": "border", "perilous": 0 },
    "13_8": { "type": "border", "perilous": 0 },
    "10_10": { "type": "border", "perilous": 0 },
    "9_12": { "type": "border", "perilous": 0 },
    "9_15": { "type": "border", "perilous": 0 },
    "10_16": { "type": "border", "perilous": 0 },
    "9_17": { "type": "border", "perilous": 0 },
    "10_17": { "type": "border", "perilous": 0 },
    "9_16": { "type": "border", "perilous": 0 },
    "11_18": { "type": "border", "perilous": 0 },
    "10_18": { "type": "border", "perilous": 0 },
    "10_19": { "type": "border", "perilous": 0 },
    "12_18": { "type": "border", "perilous": 0 },
    "11_19": { "type": "border", "perilous": 0 },
    "12_19": { "type": "border", "perilous": 0 },
    "13_20": { "type": "border", "perilous": 0 },
    "13_19": { "type": "border", "perilous": 0 },
    "14_20": { "type": "border", "perilous": 0 },
    "13_18": { "type": "border", "perilous": 0 },
    "14_18": { "type": "border", "perilous": 0 },
    "13_17": { "type": "border", "perilous": 0 },
    "14_17": { "type": "border", "perilous": 0 },
    "15_18": { "type": "border", "perilous": 0 },
    "16_18": { "type": "border", "perilous": 0 },
    "15_17": { "type": "border", "perilous": 0 },
    "17_18": { "type": "border", "perilous": 0 },
    "16_19": { "type": "border", "perilous": 0 },
    "17_19": { "type": "border", "perilous": 0 },
    "18_19": { "type": "border", "perilous": 0 },
    "19_19": { "type": "border", "perilous": 0 },
    "20_19": { "type": "border", "perilous": 0 },
    "21_18": { "type": "border", "perilous": 0 },
    "19_17": { "type": "impassable", "perilous": 0 },
    "19_16": { "type": "impassable", "perilous": 0 },
    "19_15": { "type": "impassable", "perilous": 0 },
    "19_14": { "type": "impassable", "perilous": 0 },
    "19_13": { "type": "impassable", "perilous": 0 },
    "19_12": { "type": "impassable", "perilous": 0 },
    "19_11": { "type": "impassable", "perilous": 0 },
    "18_11": { "type": "impassable", "perilous": 0 },
    "19_10": { "type": "impassable", "perilous": 0 },
    "18_9": { "type": "impassable", "perilous": 0 },
    "18_8": { "type": "impassable", "perilous": 0 },
    "18_7": { "type": "impassable", "perilous": 0 },
    "19_8": { "type": "impassable", "perilous": 0 },
    "19_6": { "type": "impassable", "perilous": 0 },
    "18_5": { "type": "impassable", "perilous": 0 },
    "18_3": { "type": "impassable", "perilous": 0 },
    "19_3": { "type": "impassable", "perilous": 0 },
    "20_2": { "type": "impassable", "perilous": 0 },
    "21_2": { "type": "impassable", "perilous": 0 },
    "21_1": { "type": "impassable", "perilous": 0 },
    "20_1": { "type": "impassable", "perilous": 0 },
    "18_4": { "type": null, "perilous": 2 },
    "19_4": { "type": null, "perilous": 1 },
    "15_9": { "type": "border", "perilous": 0 },
    "16_10": { "type": "border", "perilous": 0 },
    "15_11": { "type": "border", "perilous": 0 },
    "12_13": { "type": "border", "perilous": 0 },
    "13_13": { "type": "border", "perilous": 0 },
    "12_14": { "type": "border", "perilous": 0 },
    "13_14": { "type": "border", "perilous": 0 },
    "14_14": { "type": "border", "perilous": 0 },
    "12_15": { "type": "border", "perilous": 0 },
    "13_15": { "type": "border", "perilous": 0 },
    "14_13": { "type": "border", "perilous": 0 },
    "15_12": { "type": "border", "perilous": 0 },
    "14_11": { "type": "border", "perilous": 0 },
    "15_10": { "type": "border", "perilous": 0 },
    "16_12": { "type": "border", "perilous": 0 },
    "15_13": { "type": "border", "perilous": 0 },
    "17_10": { "type": "border", "perilous": 0 },
    "16_9": { "type": "border", "perilous": 0 },
    "16_11": { "type": "border", "perilous": 0 },
    "15_14": { "type": "border", "perilous": 0 },
    "14_15": { "type": "border", "perilous": 0 },
    "16_14": { "type": "border", "perilous": 0 },
    "15_15": { "type": "border", "perilous": 0 },
    "17_14": { "type": "border", "perilous": 0 },
    "16_13": { "type": "border", "perilous": 0 },
    "16_15": { "type": "border", "perilous": 0 },
    "13_16": { "type": "border", "perilous": 0 },
    "14_16": { "type": "border", "perilous": 0 },
    "15_16": { "type": "border", "perilous": 0 },
    "16_16": { "type": "border", "perilous": 0 },
    "19_18": { "type": "border", "perilous": 0 },
    "20_18": { "type": "border", "perilous": 0 },
    "18_18": { "type": "border", "perilous": 0 },
    "18_17": { "type": "border", "perilous": 0 },
    "17_17": { "type": "border", "perilous": 0 },
    "16_17": { "type": "border", "perilous": 0 },
    "21_17": { "type": "border", "perilous": 0 },
    "22_17": { "type": "border", "perilous": 0 },
    "23_16": { "type": "border", "perilous": 0 },
    "24_16": { "type": "border", "perilous": 0 },
    "24_17": { "type": "border", "perilous": 0 },
    "23_17": { "type": "border", "perilous": 0 },
    "22_18": { "type": "border", "perilous": 0 },
    "23_18": { "type": "border", "perilous": 0 },
    "24_18": { "type": "border", "perilous": 0 },
    "23_19": { "type": "border", "perilous": 0 },
    "22_19": { "type": "border", "perilous": 0 },
    "23_20": { "type": "border", "perilous": 0 },
    "22_20": { "type": "border", "perilous": 0 },
    "22_21": { "type": "dark", "perilous": 0 },
    "23_21": { "type": "dark", "perilous": 0 },
    "23_22": { "type": "dark", "perilous": 0 },
    "24_22": { "type": "dark", "perilous": 0 },
    "22_23": { "type": "dark", "perilous": 0 },
    "23_23": { "type": "dark", "perilous": 0 },
    "23_24": { "type": "dark", "perilous": 0 },
    "22_24": { "type": "dark", "perilous": 0 },
    "24_24": { "type": "dark", "perilous": 0 },
    "22_22": { "type": "impassable", "perilous": 0 },
    "21_23": { "type": "impassable", "perilous": 0 },
    "21_24": { "type": "impassable", "perilous": 0 },
    "20_25": { "type": "impassable", "perilous": 0 },
    "21_25": { "type": "impassable", "perilous": 0 },
    "21_26": { "type": "impassable", "perilous": 0 },
    "22_26": { "type": "impassable", "perilous": 0 },
    "21_27": { "type": "impassable", "perilous": 0 },
    "22_27": { "type": "impassable", "perilous": 0 },
    "23_28": { "type": "impassable", "perilous": 0 },
    "23_29": { "type": "impassable", "perilous": 0 },
    "15_27": { "type": "border", "perilous": 0 },
    "16_27": { "type": "border", "perilous": 0 },
    "18_28": { "type": "border", "perilous": 0 },
    "17_27": { "type": "border", "perilous": 0 },
    "15_26": { "type": "border", "perilous": 0 },
    "14_22": { "type": "border", "perilous": 0 },
    "14_23": { "type": "border", "perilous": 0 },
    "14_24": { "type": "wild", "perilous": 0 },
    "15_25": { "type": "border", "perilous": 0 },
    "14_25": { "type": "border", "perilous": 0 },
    "15_24": { "type": "border", "perilous": 0 },
    "15_23": { "type": "border", "perilous": 0 },
    "16_24": { "type": "border", "perilous": 0 },
    "16_25": { "type": "border", "perilous": 0 },
    "16_26": { "type": "border", "perilous": 0 },
    "17_26": { "type": "border", "perilous": 0 },
    "19_28": { "type": "border", "perilous": 0 },
    "18_27": { "type": "border", "perilous": 0 },
    "18_26": { "type": "border", "perilous": 0 },
    "18_25": { "type": "border", "perilous": 0 },
    "19_24": { "type": "border", "perilous": 0 },
    "21_22": { "type": "border", "perilous": 0 },
    "20_23": { "type": "border", "perilous": 0 },
    "19_23": { "type": "border", "perilous": 0 },
    "19_21": { "type": "border", "perilous": 0 },
    "20_22": { "type": "border", "perilous": 0 },
    "19_22": { "type": "border", "perilous": 0 },
    "18_22": { "type": "border", "perilous": 0 },
    "18_23": { "type": "border", "perilous": 0 },
    "18_24": { "type": "border", "perilous": 0 },
    "17_25": { "type": "border", "perilous": 0 },
    "17_24": { "type": "border", "perilous": 0 },
    "16_23": { "type": "border", "perilous": 0 },
    "17_22": { "type": "border", "perilous": 0 },
    "17_23": { "type": "border", "perilous": 0 },
    "16_22": { "type": "border", "perilous": 0 },
    "18_21": { "type": "border", "perilous": 0 },
    "20_21": { "type": "border", "perilous": 0 },
    "21_21": { "type": "border", "perilous": 0 },
    "22_25": { "type": "dark", "perilous": 0 },
    "23_25": { "type": "dark", "perilous": 0 },
    "24_25": { "type": "dark", "perilous": 0 },
    "25_25": { "type": "dark", "perilous": 0 },
    "26_25": { "type": "dark", "perilous": 0 },
    "27_25": { "type": "dark", "perilous": 0 },
    "28_25": { "type": "dark", "perilous": 0 },
    "29_25": { "type": "dark", "perilous": 0 },
    "29_26": { "type": "dark", "perilous": 0 },
    "28_26": { "type": "dark", "perilous": 0 },
    "27_26": { "type": "dark", "perilous": 0 },
    "26_26": { "type": "dark", "perilous": 0 },
    "25_26": { "type": "dark", "perilous": 0 },
    "24_26": { "type": "dark", "perilous": 0 },
    "23_26": { "type": "dark", "perilous": 0 },
    "23_27": { "type": "dark", "perilous": 0 },
    "24_27": { "type": "dark", "perilous": 0 },
    "25_27": { "type": "dark", "perilous": 0 },
    "24_28": { "type": "dark", "perilous": 0 },
    "25_28": { "type": "dark", "perilous": 0 },
    "26_28": { "type": "dark", "perilous": 0 },
    "24_29": { "type": "dark", "perilous": 0 },
    "25_29": { "type": "dark", "perilous": 0 },
    "26_29": { "type": "dark", "perilous": 0 },
    "24_30": { "type": "dark", "perilous": 0 },
    "25_30": { "type": "dark", "perilous": 0 },
    "26_30": { "type": "dark", "perilous": 0 },
    "24_34": { "type": "dark", "perilous": 0 },
    "25_34": { "type": "dark", "perilous": 0 },
    "25_33": { "type": "dark", "perilous": 0 },
    "26_32": { "type": "dark", "perilous": 0 },
    "26_31": { "type": "dark", "perilous": 0 },
    "27_30": { "type": "dark", "perilous": 0 },
    "27_31": { "type": "dark", "perilous": 0 },
    "27_32": { "type": "dark", "perilous": 0 },
    "25_31": { "type": "dark", "perilous": 0 },
    "25_32": { "type": "dark", "perilous": 0 },
    "24_33": { "type": "dark", "perilous": 0 },
    "23_33": { "type": "dark", "perilous": 0 },
    "21_20": { "type": "border", "perilous": 0 },
    "17_21": { "type": "border", "perilous": 0 },
    "15_22": { "type": "border", "perilous": 0 },
    "14_21": { "type": "border", "perilous": 0 },
    "14_26": { "type": "wild", "perilous": 0 },
    "14_27": { "type": "wild", "perilous": 0 },
    "17_28": { "type": "border", "perilous": 0 },
    "17_29": { "type": "wild", "perilous": 0 },
    "16_29": { "type": "wild", "perilous": 0 },
    "17_30": { "type": "wild", "perilous": 0 },
    "18_30": { "type": "wild", "perilous": 0 },
    "18_29": { "type": "border", "perilous": 0 },
    "19_29": { "type": "border", "perilous": 0 },
    "20_24": { "type": "wild", "perilous": 0 },
    "19_25": { "type": "wild", "perilous": 0 },
    "19_26": { "type": "wild", "perilous": 0 },
    "20_26": { "type": "wild", "perilous": 0 },
    "19_27": { "type": "wild", "perilous": 0 },
    "20_27": { "type": "wild", "perilous": 0 },
    "20_28": { "type": "wild", "perilous": 0 },
    "21_28": { "type": "wild", "perilous": 0 },
    "22_28": { "type": "wild", "perilous": 0 },
    "21_29": { "type": "wild", "perilous": 0 },
    "22_29": { "type": "wild", "perilous": 0 },
    "20_29": { "type": "wild", "perilous": 0 },
    "19_30": { "type": "wild", "perilous": 0 },
    "18_31": { "type": "wild", "perilous": 0 },
    "19_31": { "type": "wild", "perilous": 0 },
    "20_30": { "type": "wild", "perilous": 0 },
    "21_30": { "type": "wild", "perilous": 0 },
    "20_31": { "type": "wild", "perilous": 0 },
    "24_31": { "type": "wild", "perilous": 0 },
    "24_32": { "type": "wild", "perilous": 0 },
    "23_32": { "type": "wild", "perilous": 0 },
    "23_31": { "type": "wild", "perilous": 0 },
    "22_31": { "type": "wild", "perilous": 0 },
    "23_30": { "type": "wild", "perilous": 0 },
    "22_30": { "type": "wild", "perilous": 0 },
    "21_31": { "type": "wild", "perilous": 0 },
    "21_32": { "type": "wild", "perilous": 0 },
    "22_32": { "type": "wild", "perilous": 0 },
    "17_6": { "type": "wild", "perilous": 0 },
    "16_6": { "type": "wild", "perilous": 0 },
    "15_5": { "type": "wild", "perilous": 0 },
    "14_5": { "type": "wild", "perilous": 0 },
    "15_4": { "type": "wild", "perilous": 0 },
    "14_4": { "type": "wild", "perilous": 0 },
    "13_5": { "type": "wild", "perilous": 0 },
    "15_6": { "type": "wild", "perilous": 0 },
    "14_3": { "type": "wild", "perilous": 0 },
    "18_6": { "type": "dark", "perilous": 0 },
    "17_5": { "type": "dark", "perilous": 0 },
    "16_5": { "type": "dark", "perilous": 0 },
    "17_4": { "type": "dark", "perilous": 0 },
    "16_4": { "type": "dark", "perilous": 0 },
    "15_3": { "type": "dark", "perilous": 0 },
    "16_3": { "type": "dark", "perilous": 0 },
    "17_3": { "type": "dark", "perilous": 0 },
    "16_2": { "type": "dark", "perilous": 0 },
    "17_2": { "type": "dark", "perilous": 0 },
    "18_2": { "type": "dark", "perilous": 0 },
    "19_2": { "type": "dark", "perilous": 0 },
    "17_1": { "type": "dark", "perilous": 0 },
    "18_1": { "type": "dark", "perilous": 0 },
    "19_1": { "type": "dark", "perilous": 0 },
    "20_17": { "type": "dark", "perilous": 0 },
    "20_16": { "type": "dark", "perilous": 0 },
    "21_16": { "type": "dark", "perilous": 0 },
    "20_15": { "type": "dark", "perilous": 0 },
    "21_15": { "type": "dark", "perilous": 0 },
    "20_14": { "type": "dark", "perilous": 0 },
    "21_14": { "type": "dark", "perilous": 0 },
    "20_13": { "type": "dark", "perilous": 0 },
    "21_13": { "type": "dark", "perilous": 0 },
    "20_12": { "type": "dark", "perilous": 0 },
    "21_12": { "type": "dark", "perilous": 0 },
    "20_11": { "type": "dark", "perilous": 0 },
    "21_11": { "type": "dark", "perilous": 0 },
    "20_10": { "type": "dark", "perilous": 0 },
    "21_10": { "type": "dark", "perilous": 0 },
    "22_10": { "type": "dark", "perilous": 0 },
    "19_9": { "type": "dark", "perilous": 0 },
    "20_9": { "type": "dark", "perilous": 0 },
    "21_9": { "type": "dark", "perilous": 0 },
    "20_8": { "type": "dark", "perilous": 0 },
    "21_8": { "type": "dark", "perilous": 0 },
    "19_7": { "type": "dark", "perilous": 0 },
    "20_7": { "type": "dark", "perilous": 0 },
    "21_7": { "type": "dark", "perilous": 0 },
    "22_6": { "type": "dark", "perilous": 0 },
    "22_5": { "type": "dark", "perilous": 0 },
    "22_4": { "type": "dark", "perilous": 0 },
    "22_3": { "type": "dark", "perilous": 0 },
    "23_2": { "type": "dark", "perilous": 0 },
    "24_2": { "type": "dark", "perilous": 0 },
    "22_2": { "type": "dark", "perilous": 0 },
    "21_3": { "type": "dark", "perilous": 0 },
    "21_4": { "type": "dark", "perilous": 0 },
    "20_3": { "type": "dark", "perilous": 0 },
    "20_4": { "type": "dark", "perilous": 0 },
    "20_5": { "type": "dark", "perilous": 0 },
    "20_6": { "type": "dark", "perilous": 0 },
    "19_5": { "type": "dark", "perilous": 0 },
    "21_5": { "type": "dark", "perilous": 0 },
    "21_6": { "type": "dark", "perilous": 0 },
    "24_3": { "type": "dark", "perilous": 0 },
    "25_3": { "type": "dark", "perilous": 0 },
    "26_4": { "type": "dark", "perilous": 0 },
    "27_4": { "type": "dark", "perilous": 0 },
    "28_4": { "type": "dark", "perilous": 0 },
    "28_3": { "type": "dark", "perilous": 0 },
    "29_3": { "type": "dark", "perilous": 0 },
    "30_3": { "type": "dark", "perilous": 0 },
    "31_3": { "type": "dark", "perilous": 0 },
    "32_3": { "type": "dark", "perilous": 0 },
    "33_3": { "type": "dark", "perilous": 0 },
    "34_3": { "type": "dark", "perilous": 0 },
    "35_3": { "type": "dark", "perilous": 0 },
    "36_3": { "type": "dark", "perilous": 0 },
    "37_3": { "type": "dark", "perilous": 0 },
    "38_3": { "type": "dark", "perilous": 0 },
    "39_3": { "type": "dark", "perilous": 0 },
    "40_4": { "type": "dark", "perilous": 0 },
    "41_4": { "type": "dark", "perilous": 0 },
    "41_5": { "type": "dark", "perilous": 0 },
    "42_5": { "type": "dark", "perilous": 0 },
    "43_5": { "type": "dark", "perilous": 0 },
    "44_5": { "type": "dark", "perilous": 0 },
    "45_5": { "type": "dark", "perilous": 0 },
    "46_6": { "type": "dark", "perilous": 0 },
    "46_7": { "type": "dark", "perilous": 0 },
    "46_8": { "type": "dark", "perilous": 0 },
    "46_9": { "type": "dark", "perilous": 0 },
    "47_9": { "type": "dark", "perilous": 0 },
    "48_10": { "type": "dark", "perilous": 0 },
    "48_11": { "type": "dark", "perilous": 0 },
    "48_12": { "type": "dark", "perilous": 0 },
    "47_13": { "type": "dark", "perilous": 0 },
    "47_14": { "type": "dark", "perilous": 0 },
    "46_14": { "type": "dark", "perilous": 0 },
    "45_15": { "type": "dark", "perilous": 0 },
    "46_16": { "type": "dark", "perilous": 0 },
    "47_16": { "type": "dark", "perilous": 0 },
    "48_16": { "type": "dark", "perilous": 0 },
    "48_17": { "type": "dark", "perilous": 0 },
    "49_19": { "type": "dark", "perilous": 0 },
    "48_19": { "type": "dark", "perilous": 0 },
    "49_20": { "type": "dark", "perilous": 0 },
    "49_21": { "type": "dark", "perilous": 0 },
    "50_21": { "type": "dark", "perilous": 0 },
    "51_22": { "type": "dark", "perilous": 0 },
    "51_23": { "type": "dark", "perilous": 0 },
    "52_24": { "type": "dark", "perilous": 0 },
    "51_25": { "type": "dark", "perilous": 0 },
    "51_26": { "type": "dark", "perilous": 0 },
    "50_27": { "type": "dark", "perilous": 0 },
    "51_24": { "type": "dark", "perilous": 0 },
    "50_25": { "type": "dark", "perilous": 0 },
    "50_26": { "type": "dark", "perilous": 0 },
    "49_27": { "type": "dark", "perilous": 0 },
    "49_28": { "type": "dark", "perilous": 0 },
    "48_28": { "type": "dark", "perilous": 0 },
    "48_29": { "type": "dark", "perilous": 0 },
    "47_29": { "type": "dark", "perilous": 0 },
    "45_29": { "type": "dark", "perilous": 0 },
    "45_30": { "type": "dark", "perilous": 0 },
    "45_28": { "type": "dark", "perilous": 0 },
    "44_29": { "type": "dark", "perilous": 1 },
    "44_30": { "type": "dark", "perilous": 0 },
    "44_28": { "type": "dark", "perilous": 0 },
    "43_29": { "type": "dark", "perilous": 1 },
    "43_30": { "type": "dark", "perilous": 0 },
    "42_29": { "type": "dark", "perilous": 1 },
    "43_28": { "type": "dark", "perilous": 0 },
    "43_27": { "type": "dark", "perilous": 0 },
    "49_29": { "type": "dark", "perilous": 0 },
    "49_30": { "type": "dark", "perilous": 0 },
    "48_31": { "type": "dark", "perilous": 0 },
    "48_32": { "type": "dark", "perilous": 0 },
    "47_33": { "type": "dark", "perilous": 0 },
    "47_34": { "type": "dark", "perilous": 0 },
    "46_34": { "type": "dark", "perilous": 0 },
    "45_35": { "type": "dark", "perilous": 0 },
    "45_36": { "type": "dark", "perilous": 0 },
    "44_37": { "type": "dark", "perilous": 0 },
    "45_38": { "type": "dark", "perilous": 0 },
    "45_39": { "type": "dark", "perilous": 0 },
    "46_40": { "type": "dark", "perilous": 0 },
    "46_41": { "type": "dark", "perilous": 0 },
    "47_41": { "type": "impassable", "perilous": 0 },
    "48_41": { "type": "impassable", "perilous": 0 },
    "49_41": { "type": "impassable", "perilous": 0 },
    "48_40": { "type": "impassable", "perilous": 0 },
    "49_40": { "type": "impassable", "perilous": 0 },
    "50_40": { "type": "impassable", "perilous": 0 },
    "48_39": { "type": "impassable", "perilous": 0 },
    "49_39": { "type": "impassable", "perilous": 0 },
    "49_38": { "type": "impassable", "perilous": 0 },
    "50_38": { "type": "impassable", "perilous": 0 },
    "49_37": { "type": "impassable", "perilous": 0 },
    "50_37": { "type": "impassable", "perilous": 0 },
    "49_36": { "type": "impassable", "perilous": 0 },
    "50_36": { "type": "impassable", "perilous": 0 },
    "51_36": { "type": "impassable", "perilous": 0 },
    "48_35": { "type": "impassable", "perilous": 0 },
    "49_35": { "type": "impassable", "perilous": 0 },
    "50_35": { "type": "impassable", "perilous": 0 },
    "50_34": { "type": "impassable", "perilous": 0 },
    "50_33": { "type": "impassable", "perilous": 0 },
    "51_32": { "type": "impassable", "perilous": 0 },
    "51_31": { "type": "impassable", "perilous": 0 },
    "52_30": { "type": "impassable", "perilous": 0 },
    "51_29": { "type": "impassable", "perilous": 0 },
    "52_29": { "type": "impassable", "perilous": 0 },
    "53_28": { "type": "impassable", "perilous": 0 },
    "51_27": { "type": "impassable", "perilous": 0 },
    "53_26": { "type": "dark", "perilous": 2 },
    "52_26": { "type": "dark", "perilous": 2 },
    "52_27": { "type": "dark", "perilous": 4 },
    "52_28": { "type": "dark", "perilous": 4 },
    "49_17": { "type": "dark", "perilous": 2 },
    "50_17": { "type": "dark", "perilous": 2 },
    "50_18": { "type": "dark", "perilous": 2 },
    "51_18": { "type": "dark", "perilous": 2 },
    "34_19": { "type": "dark", "perilous": 2 },
    "35_20": { "type": "dark", "perilous": 2 },
    "35_19": { "type": "dark", "perilous": 2 },
    "36_20": { "type": "dark", "perilous": 2 },
    "36_19": { "type": "dark", "perilous": 2 },
    "37_20": { "type": "dark", "perilous": 2 },
    "36_21": { "type": "dark", "perilous": 2 },
    "40_18": { "type": "dark", "perilous": 1 },
    "53_25": { "type": "impassable", "perilous": 0 },
    "54_26": { "type": "impassable", "perilous": 0 },
    "54_25": { "type": "impassable", "perilous": 0 },
    "54_24": { "type": "impassable", "perilous": 0 },
    "55_24": { "type": "impassable", "perilous": 0 },
    "54_23": { "type": "impassable", "perilous": 0 },
    "54_22": { "type": "impassable", "perilous": 0 },
    "55_22": { "type": "impassable", "perilous": 0 },
    "54_21": { "type": "impassable", "perilous": 0 },
    "55_21": { "type": "impassable", "perilous": 0 },
    "55_20": { "type": "impassable", "perilous": 0 },
    "56_20": { "type": "impassable", "perilous": 0 },
    "55_19": { "type": "impassable", "perilous": 0 },
    "56_19": { "type": "impassable", "perilous": 0 },
    "56_18": { "type": "impassable", "perilous": 0 },
    "57_18": { "type": "impassable", "perilous": 0 },
    "55_17": { "type": "dark", "perilous": 2 },
    "56_17": { "type": "dark", "perilous": 2 },
    "56_16": { "type": "impassable", "perilous": 0 },
    "56_15": { "type": "impassable", "perilous": 0 },
    "56_14": { "type": "impassable", "perilous": 0 },
    "56_13": { "type": "impassable", "perilous": 0 },
    "56_12": { "type": "impassable", "perilous": 0 },
    "55_11": { "type": "impassable", "perilous": 0 },
    "55_10": { "type": "impassable", "perilous": 0 },
    "54_10": { "type": "impassable", "perilous": 0 },
    "51_10": { "type": "impassable", "perilous": 0 },
    "50_10": { "type": "impassable", "perilous": 0 },
    "49_9": { "type": "impassable", "perilous": 0 },
    "54_9": { "type": "impassable", "perilous": 0 },
    "54_8": { "type": "impassable", "perilous": 0 },
    "53_7": { "type": "impassable", "perilous": 0 },
    "56_7": { "type": "impassable", "perilous": 0 },
    "55_7": { "type": "impassable", "perilous": 0 },
    "52_6": { "type": "impassable", "perilous": 0 },
    "51_5": { "type": "impassable", "perilous": 0 },
    "50_5": { "type": "impassable", "perilous": 0 },
    "51_4": { "type": "impassable", "perilous": 0 },
    "50_4": { "type": "impassable", "perilous": 0 },
    "49_4": { "type": "impassable", "perilous": 0 },
    "48_3": { "type": "impassable", "perilous": 0 },
    "47_3": { "type": "impassable", "perilous": 0 },
    "47_2": { "type": "impassable", "perilous": 0 },
    "46_1": { "type": "impassable", "perilous": 0 },
    "45_2": { "type": "dark", "perilous": 3 },
    "46_2": { "type": "dark", "perilous": 3 },
    "45_3": { "type": "dark", "perilous": 3 },
    "53_6": { "type": "dark", "perilous": 3 },
    "54_6": { "type": "dark", "perilous": 3 },
    "54_7": { "type": null, "perilous": 3 },
    "48_9": { "type": "dark", "perilous": 3 },
    "49_8": { "type": "dark", "perilous": 3 },
    "48_8": { "type": "dark", "perilous": 3 },
    "52_10": { "type": "dark", "perilous": 2 },
    "53_10": { "type": "dark", "perilous": 2 },
    "51_19": { "type": "dark", "perilous": 0 },
    "50_19": { "type": "dark", "perilous": 0 },
    "50_20": { "type": "dark", "perilous": 0 },
    "34_18": { "type": "dark", "perilous": 0 },
    "35_18": { "type": "dark", "perilous": 0 },
    "36_18": { "type": "dark", "perilous": 0 },
    "35_21": { "type": "dark", "perilous": 0 },
    "37_19": { "type": "dark", "perilous": 0 },
    "37_18": { "type": "dark", "perilous": 0 },
    "36_22": { "type": "dark", "perilous": 0 },
    "37_22": { "type": "dark", "perilous": 0 },
    "36_23": { "type": "dark", "perilous": 0 },
    "38_20": { "type": "dark", "perilous": 0 },
    "37_21": { "type": "dark", "perilous": 0 },
    "38_22": { "type": "dark", "perilous": 0 },
    "38_21": { "type": "dark", "perilous": 0 },
    "39_20": { "type": "dark", "perilous": 0 },
    "39_21": { "type": "dark", "perilous": 0 },
    "39_22": { "type": "dark", "perilous": 0 },
    "40_20": { "type": "dark", "perilous": 0 },
    "41_20": { "type": "dark", "perilous": 0 },
    "42_20": { "type": "dark", "perilous": 0 },
    "43_21": { "type": "dark", "perilous": 0 },
    "42_21": { "type": "dark", "perilous": 0 },
    "41_21": { "type": "dark", "perilous": 0 },
    "40_21": { "type": "dark", "perilous": 0 },
    "43_22": { "type": "dark", "perilous": 0 },
    "42_22": { "type": "dark", "perilous": 0 },
    "41_22": { "type": "dark", "perilous": 0 },
    "40_22": { "type": "dark", "perilous": 0 },
    "39_23": { "type": "dark", "perilous": 0 },
    "39_18": { "type": "dark", "perilous": 0 },
    "38_17": { "type": "dark", "perilous": 0 },
    "38_16": { "type": "dark", "perilous": 0 },
    "38_15": { "type": "dark", "perilous": 0 },
    "38_14": { "type": "dark", "perilous": 0 },
    "33_15": { "type": "dark", "perilous": 0 },
    "34_14": { "type": "dark", "perilous": 0 },
    "35_14": { "type": "dark", "perilous": 0 },
    "36_14": { "type": "dark", "perilous": 0 },
    "36_13": { "type": "dark", "perilous": 0 },
    "37_13": { "type": "dark", "perilous": 0 },
    "32_15": { "type": "dark", "perilous": 0 },
    "32_14": { "type": "dark", "perilous": 0 },
    "31_14": { "type": "dark", "perilous": 0 },
    "30_14": { "type": "dark", "perilous": 0 },
    "29_15": { "type": "dark", "perilous": 0 },
    "28_15": { "type": "dark", "perilous": 0 },
    "27_15": { "type": "dark", "perilous": 0 },
    "28_14": { "type": "dark", "perilous": 0 },
    "27_13": { "type": "dark", "perilous": 0 },
    "28_12": { "type": "dark", "perilous": 0 },
    "28_11": { "type": "dark", "perilous": 0 },
    "29_10": { "type": "dark", "perilous": 0 },
    "29_8": { "type": "dark", "perilous": 0 },
    "28_9": { "type": "dark", "perilous": 0 },
    "28_8": { "type": "dark", "perilous": 0 },
    "27_7": { "type": "dark", "perilous": 0 },
    "28_6": { "type": "dark", "perilous": 0 },
    "28_7": { "type": "dark", "perilous": 0 },
    "29_7": { "type": "dark", "perilous": 0 },
    "30_7": { "type": "dark", "perilous": 0 },
    "31_8": { "type": "dark", "perilous": 0 },
    "32_8": { "type": "dark", "perilous": 0 },
    "32_9": { "type": "dark", "perilous": 0 },
    "33_9": { "type": "dark", "perilous": 0 },
    "34_9": { "type": "dark", "perilous": 0 },
    "35_9": { "type": "dark", "perilous": 0 },
    "36_9": { "type": "dark", "perilous": 0 },
    "37_8": { "type": "dark", "perilous": 0 },
    "38_8": { "type": "dark", "perilous": 0 },
    "39_8": { "type": "dark", "perilous": 0 },
    "40_8": { "type": "dark", "perilous": 0 },
    "40_9": { "type": "dark", "perilous": 0 },
    "41_10": { "type": "dark", "perilous": 0 },
    "42_10": { "type": "dark", "perilous": 0 },
    "41_11": { "type": "dark", "perilous": 0 },
    "40_11": { "type": "dark", "perilous": 0 },
    "40_12": { "type": "dark", "perilous": 0 },
    "39_11": { "type": "dark", "perilous": 0 },
    "40_10": { "type": "dark", "perilous": 0 },
    "39_9": { "type": "dark", "perilous": 0 },
    "38_9": { "type": "dark", "perilous": 0 },
    "40_13": { "type": "dark", "perilous": 0 },
    "41_14": { "type": "dark", "perilous": 0 },
    "42_14": { "type": "dark", "perilous": 0 },
    "42_15": { "type": "dark", "perilous": 0 },
    "43_16": { "type": "dark", "perilous": 0 },
    "42_17": { "type": "dark", "perilous": 0 },
    "43_18": { "type": "dark", "perilous": 0 },
    "42_18": { "type": "dark", "perilous": 0 },
    "41_18": { "type": "dark", "perilous": 0 },
    "27_29": { "type": "dark", "perilous": 0 },
    "28_29": { "type": "dark", "perilous": 0 },
    "29_29": { "type": "dark", "perilous": 0 },
    "30_29": { "type": "dark", "perilous": 0 },
    "30_28": { "type": "dark", "perilous": 0 },
    "30_30": { "type": "dark", "perilous": 0 },
    "29_31": { "type": "dark", "perilous": 0 },
    "30_32": { "type": "dark", "perilous": 0 },
    "30_33": { "type": "dark", "perilous": 0 },
    "30_34": { "type": "dark", "perilous": 0 },
    "29_35": { "type": "dark", "perilous": 0 },
    "30_36": { "type": "dark", "perilous": 0 },
    "29_37": { "type": "dark", "perilous": 0 },
    "29_38": { "type": "dark", "perilous": 0 },
    "30_40": { "type": "dark", "perilous": 0 },
    "29_39": { "type": "dark", "perilous": 0 },
    "30_41": { "type": "dark", "perilous": 0 },
    "31_41": { "type": "dark", "perilous": 0 },
    "33_39": { "type": "dark", "perilous": 0 },
    "33_38": { "type": "dark", "perilous": 0 },
    "34_38": { "type": "dark", "perilous": 0 },
    "33_37": { "type": "dark", "perilous": 0 },
    "34_36": { "type": "dark", "perilous": 0 },
    "35_36": { "type": "dark", "perilous": 0 },
    "35_37": { "type": "dark", "perilous": 0 },
    "36_38": { "type": "dark", "perilous": 0 },
    "35_39": { "type": "dark", "perilous": 0 },
    "36_40": { "type": "dark", "perilous": 0 },
    "37_40": { "type": "dark", "perilous": 0 },
    "37_41": { "type": "dark", "perilous": 0 },
    "38_41": { "type": "dark", "perilous": 0 },
    "39_41": { "type": "dark", "perilous": 0 },
    "40_40": { "type": "dark", "perilous": 0 },
    "41_40": { "type": "dark", "perilous": 0 },
    "41_39": { "type": "dark", "perilous": 0 },
    "42_38": { "type": "dark", "perilous": 0 },
    "42_39": { "type": "dark", "perilous": 0 },
    "43_40": { "type": "dark", "perilous": 0 },
    "43_41": { "type": "dark", "perilous": 0 },
    "24_21": { "type": "border", "perilous": 0 },
    "29_23": { "type": "border", "perilous": 0 },
    "30_23": { "type": "border", "perilous": 0 },
    "29_22": { "type": "border", "perilous": 0 },
    "28_21": { "type": "border", "perilous": 0 },
    "25_21": { "type": "border", "perilous": 0 },
    "26_20": { "type": "border", "perilous": 0 },
    "26_21": { "type": "border", "perilous": 0 },
    "27_20": { "type": "border", "perilous": 0 },
    "27_21": { "type": "border", "perilous": 0 },
    "25_17": { "type": "border", "perilous": 0 },
    "26_18": { "type": "border", "perilous": 0 },
    "27_18": { "type": "border", "perilous": 0 },
    "31_15": { "type": "border", "perilous": 0 },
    "30_15": { "type": "border", "perilous": 0 },
    "30_16": { "type": "border", "perilous": 0 },
    "29_16": { "type": "border", "perilous": 0 },
    "28_17": { "type": "border", "perilous": 0 },
    "27_17": { "type": "border", "perilous": 0 },
    "33_16": { "type": "border", "perilous": 0 },
    "33_17": { "type": "border", "perilous": 0 },
    "31_23": { "type": "border", "perilous": 0 },
    "32_23": { "type": "border", "perilous": 0 },
    "33_23": { "type": "border", "perilous": 0 },
    "34_23": { "type": "border", "perilous": 0 },
    "35_22": { "type": "border", "perilous": 0 },
    "24_19": { "type": "border", "perilous": 0 },
    "25_20": { "type": "border", "perilous": 0 },
    "24_20": { "type": "border", "perilous": 0 },
    "25_18": { "type": "border", "perilous": 0 },
    "25_19": { "type": "border", "perilous": 0 },
    "26_19": { "type": "border", "perilous": 0 },
    "27_19": { "type": "border", "perilous": 0 },
    "28_19": { "type": "border", "perilous": 0 },
    "28_18": { "type": "border", "perilous": 0 },
    "28_20": { "type": "border", "perilous": 0 },
    "29_20": { "type": "border", "perilous": 0 },
    "30_20": { "type": "border", "perilous": 0 },
    "31_20": { "type": "border", "perilous": 0 },
    "31_19": { "type": "border", "perilous": 0 },
    "31_18": { "type": "border", "perilous": 0 },
    "30_19": { "type": "border", "perilous": 0 },
    "30_18": { "type": "border", "perilous": 0 },
    "29_19": { "type": "border", "perilous": 0 },
    "29_18": { "type": "border", "perilous": 0 },
    "29_17": { "type": "border", "perilous": 0 },
    "30_17": { "type": "border", "perilous": 0 },
    "31_16": { "type": "border", "perilous": 0 },
    "31_17": { "type": "border", "perilous": 0 },
    "32_17": { "type": "border", "perilous": 0 },
    "32_16": { "type": "border", "perilous": 0 },
    "32_18": { "type": "border", "perilous": 0 },
    "32_19": { "type": "border", "perilous": 0 },
    "33_20": { "type": "border", "perilous": 0 },
    "33_19": { "type": "border", "perilous": 0 },
    "33_18": { "type": "border", "perilous": 0 },
    "33_21": { "type": "border", "perilous": 0 },
    "34_22": { "type": "border", "perilous": 0 },
    "34_21": { "type": "border", "perilous": 0 },
    "34_20": { "type": "border", "perilous": 0 },
    "33_22": { "type": "border", "perilous": 0 },
    "32_21": { "type": "border", "perilous": 0 },
    "32_22": { "type": "border", "perilous": 0 },
    "31_21": { "type": "border", "perilous": 0 },
    "31_22": { "type": "border", "perilous": 0 },
    "32_20": { "type": "border", "perilous": 0 },
    "30_21": { "type": "border", "perilous": 0 },
    "29_21": { "type": "border", "perilous": 0 },
    "30_22": { "type": "border", "perilous": 0 },
    "26_3": { "type": "dark", "perilous": 0 },
    "27_3": { "type": "dark", "perilous": 0 },
    "25_2": { "type": "dark", "perilous": 0 },
    "26_2": { "type": "dark", "perilous": 0 },
    "27_2": { "type": "dark", "perilous": 0 },
    "28_2": { "type": "dark", "perilous": 0 },
    "28_1": { "type": "dark", "perilous": 0 },
    "29_2": { "type": "dark", "perilous": 0 },
    "30_2": { "type": "dark", "perilous": 0 },
    "31_2": { "type": "dark", "perilous": 0 },
    "32_2": { "type": "dark", "perilous": 0 },
    "30_1": { "type": "dark", "perilous": 0 },
    "33_2": { "type": "dark", "perilous": 0 },
    "34_2": { "type": "dark", "perilous": 0 },
    "35_2": { "type": "dark", "perilous": 0 },
    "36_2": { "type": "dark", "perilous": 0 },
    "37_2": { "type": "dark", "perilous": 0 },
    "38_2": { "type": "dark", "perilous": 0 },
    "39_2": { "type": "dark", "perilous": 0 },
    "40_2": { "type": "dark", "perilous": 0 },
    "41_2": { "type": "dark", "perilous": 0 },
    "42_2": { "type": "dark", "perilous": 0 },
    "41_3": { "type": "dark", "perilous": 0 },
    "40_3": { "type": "dark", "perilous": 0 },
    "42_4": { "type": "dark", "perilous": 0 },
    "42_3": { "type": "dark", "perilous": 0 },
    "43_3": { "type": "dark", "perilous": 0 },
    "43_2": { "type": "dark", "perilous": 0 },
    "44_2": { "type": "dark", "perilous": 0 },
    "44_1": { "type": "dark", "perilous": 0 },
    "45_1": { "type": "dark", "perilous": 0 },
    "44_3": { "type": "dark", "perilous": 0 },
    "44_4": { "type": "dark", "perilous": 0 },
    "45_4": { "type": "dark", "perilous": 0 },
    "46_3": { "type": "dark", "perilous": 0 },
    "46_4": { "type": "dark", "perilous": 0 },
    "43_4": { "type": "dark", "perilous": 0 },
    "22_1": { "type": "dark", "perilous": 0 },
    "23_1": { "type": "dark", "perilous": 0 },
    "24_1": { "type": "dark", "perilous": 0 },
    "25_1": { "type": "dark", "perilous": 0 },
    "26_1": { "type": "dark", "perilous": 0 },
    "27_1": { "type": "dark", "perilous": 0 },
    "32_1": { "type": "dark", "perilous": 0 },
    "33_1": { "type": "dark", "perilous": 0 },
    "29_1": { "type": "dark", "perilous": 0 },
    "31_1": { "type": "dark", "perilous": 0 },
    "34_1": { "type": "dark", "perilous": 0 },
    "35_1": { "type": "dark", "perilous": 0 },
    "36_1": { "type": "dark", "perilous": 0 },
    "37_1": { "type": "dark", "perilous": 0 },
    "38_1": { "type": "dark", "perilous": 0 },
    "39_1": { "type": "dark", "perilous": 0 },
    "40_1": { "type": "dark", "perilous": 0 },
    "41_1": { "type": "dark", "perilous": 0 },
    "42_1": { "type": "dark", "perilous": 0 },
    "43_1": { "type": "dark", "perilous": 0 },
    "47_4": { "type": "dark", "perilous": 0 },
    "46_5": { "type": "dark", "perilous": 0 },
    "47_6": { "type": "dark", "perilous": 0 },
    "47_7": { "type": "dark", "perilous": 0 },
    "47_8": { "type": "dark", "perilous": 0 },
    "49_10": { "type": "dark", "perilous": 0 },
    "49_11": { "type": "dark", "perilous": 0 },
    "49_12": { "type": "dark", "perilous": 0 },
    "49_13": { "type": "dark", "perilous": 0 },
    "48_13": { "type": "dark", "perilous": 0 },
    "49_14": { "type": "dark", "perilous": 0 },
    "48_14": { "type": "dark", "perilous": 0 },
    "47_15": { "type": "dark", "perilous": 0 },
    "46_15": { "type": "dark", "perilous": 0 },
    "48_15": { "type": "dark", "perilous": 0 },
    "49_15": { "type": "dark", "perilous": 0 },
    "49_16": { "type": "dark", "perilous": 0 },
    "50_16": { "type": "dark", "perilous": 0 },
    "51_16": { "type": "dark", "perilous": 0 },
    "50_15": { "type": "dark", "perilous": 0 },
    "50_14": { "type": "dark", "perilous": 0 },
    "50_13": { "type": "dark", "perilous": 0 },
    "50_12": { "type": "dark", "perilous": 0 },
    "50_11": { "type": "dark", "perilous": 0 },
    "48_4": { "type": "dark", "perilous": 0 },
    "47_5": { "type": "dark", "perilous": 0 },
    "48_6": { "type": "dark", "perilous": 0 },
    "48_5": { "type": "dark", "perilous": 0 },
    "49_5": { "type": "dark", "perilous": 0 },
    "50_6": { "type": "dark", "perilous": 0 },
    "49_6": { "type": "dark", "perilous": 0 },
    "48_7": { "type": "dark", "perilous": 0 },
    "49_7": { "type": "dark", "perilous": 0 },
    "50_8": { "type": "dark", "perilous": 0 },
    "51_8": { "type": "dark", "perilous": 0 },
    "50_9": { "type": "dark", "perilous": 0 },
    "51_9": { "type": "dark", "perilous": 0 },
    "52_8": { "type": "dark", "perilous": 0 },
    "52_9": { "type": "dark", "perilous": 0 },
    "53_9": { "type": "dark", "perilous": 0 },
    "53_8": { "type": "dark", "perilous": 0 },
    "52_7": { "type": "dark", "perilous": 0 },
    "51_7": { "type": "dark", "perilous": 0 },
    "50_7": { "type": "dark", "perilous": 0 },
    "51_6": { "type": "dark", "perilous": 0 },
    "52_11": { "type": "dark", "perilous": 0 },
    "51_11": { "type": "dark", "perilous": 0 },
    "52_12": { "type": "dark", "perilous": 0 },
    "53_12": { "type": "dark", "perilous": 0 },
    "53_11": { "type": "dark", "perilous": 0 },
    "54_11": { "type": "dark", "perilous": 0 },
    "54_12": { "type": "dark", "perilous": 0 },
    "51_12": { "type": "dark", "perilous": 0 },
    "51_13": { "type": "dark", "perilous": 0 },
    "52_13": { "type": "dark", "perilous": 0 },
    "53_13": { "type": "dark", "perilous": 0 },
    "54_13": { "type": "dark", "perilous": 0 },
    "55_12": { "type": "dark", "perilous": 0 },
    "55_13": { "type": "dark", "perilous": 0 },
    "54_14": { "type": "dark", "perilous": 0 },
    "53_14": { "type": "dark", "perilous": 0 },
    "52_14": { "type": "dark", "perilous": 0 },
    "51_14": { "type": "dark", "perilous": 0 },
    "51_15": { "type": "dark", "perilous": 0 },
    "52_15": { "type": "dark", "perilous": 0 },
    "53_15": { "type": "dark", "perilous": 0 },
    "54_15": { "type": "dark", "perilous": 0 },
    "55_14": { "type": "dark", "perilous": 0 },
    "55_15": { "type": "dark", "perilous": 0 },
    "54_16": { "type": "dark", "perilous": 0 },
    "53_16": { "type": "dark", "perilous": 0 },
    "52_16": { "type": "dark", "perilous": 0 },
    "55_16": { "type": "dark", "perilous": 0 },
    "54_17": { "type": "dark", "perilous": 0 },
    "53_17": { "type": "dark", "perilous": 0 },
    "52_17": { "type": "dark", "perilous": 0 },
    "51_17": { "type": "dark", "perilous": 0 },
    "57_12": { "type": "dark", "perilous": 0 },
    "56_11": { "type": "dark", "perilous": 0 },
    "56_10": { "type": "dark", "perilous": 0 },
    "56_9": { "type": "dark", "perilous": 0 },
    "55_9": { "type": "dark", "perilous": 0 },
    "55_8": { "type": "dark", "perilous": 0 },
    "56_8": { "type": "dark", "perilous": 0 },
    "57_8": { "type": "dark", "perilous": 0 },
    "57_10": { "type": "dark", "perilous": 0 },
    "47_1": { "type": "dark", "perilous": 0 },
    "48_1": { "type": "dark", "perilous": 0 },
    "49_1": { "type": "dark", "perilous": 0 },
    "50_1": { "type": "dark", "perilous": 0 },
    "51_1": { "type": "dark", "perilous": 0 },
    "52_1": { "type": "dark", "perilous": 0 },
    "53_1": { "type": "dark", "perilous": 0 },
    "54_1": { "type": "dark", "perilous": 0 },
    "55_1": { "type": "dark", "perilous": 0 },
    "56_1": { "type": "dark", "perilous": 0 },
    "56_2": { "type": "dark", "perilous": 0 },
    "56_3": { "type": "dark", "perilous": 0 },
    "56_4": { "type": "dark", "perilous": 0 },
    "56_5": { "type": "dark", "perilous": 0 },
    "55_2": { "type": "dark", "perilous": 0 },
    "54_2": { "type": "dark", "perilous": 0 },
    "53_2": { "type": "dark", "perilous": 0 },
    "52_2": { "type": "dark", "perilous": 0 },
    "51_2": { "type": "dark", "perilous": 0 },
    "50_2": { "type": "dark", "perilous": 0 },
    "49_2": { "type": "dark", "perilous": 0 },
    "48_2": { "type": "dark", "perilous": 0 },
    "49_3": { "type": "dark", "perilous": 0 },
    "50_3": { "type": "dark", "perilous": 0 },
    "51_3": { "type": "dark", "perilous": 0 },
    "52_3": { "type": "dark", "perilous": 0 },
    "53_3": { "type": "dark", "perilous": 0 },
    "54_3": { "type": "dark", "perilous": 0 },
    "55_3": { "type": "dark", "perilous": 0 },
    "52_4": { "type": "dark", "perilous": 0 },
    "53_4": { "type": "dark", "perilous": 0 },
    "54_4": { "type": "dark", "perilous": 0 },
    "55_4": { "type": "dark", "perilous": 0 },
    "52_5": { "type": "dark", "perilous": 0 },
    "53_5": { "type": "dark", "perilous": 0 },
    "54_5": { "type": "dark", "perilous": 0 },
    "55_5": { "type": "dark", "perilous": 0 },
    "55_6": { "type": "dark", "perilous": 0 },
    "56_6": { "type": "dark", "perilous": 0 },
    "57_2": { "type": "dark", "perilous": 0 },
    "57_4": { "type": "dark", "perilous": 0 },
    "57_6": { "type": "dark", "perilous": 0 },
    "52_18": { "type": "dark", "perilous": 0 },
    "53_18": { "type": "dark", "perilous": 0 },
    "54_18": { "type": "dark", "perilous": 0 },
    "55_18": { "type": "dark", "perilous": 0 },
    "52_19": { "type": "dark", "perilous": 0 },
    "53_19": { "type": "dark", "perilous": 0 },
    "54_19": { "type": "dark", "perilous": 0 },
    "51_20": { "type": "dark", "perilous": 0 },
    "52_20": { "type": "dark", "perilous": 0 },
    "53_20": { "type": "dark", "perilous": 0 },
    "54_20": { "type": "dark", "perilous": 0 },
    "51_21": { "type": "dark", "perilous": 0 },
    "52_21": { "type": "dark", "perilous": 0 },
    "53_21": { "type": "dark", "perilous": 0 },
    "52_22": { "type": "dark", "perilous": 0 },
    "53_22": { "type": "dark", "perilous": 0 },
    "53_23": { "type": "dark", "perilous": 0 },
    "52_23": { "type": "dark", "perilous": 0 },
    "53_24": { "type": "dark", "perilous": 0 },
    "52_25": { "type": "dark", "perilous": 0 },
    "56_21": { "type": "dark", "perilous": 0 },
    "56_22": { "type": "dark", "perilous": 0 },
    "55_23": { "type": "dark", "perilous": 0 },
    "56_24": { "type": "dark", "perilous": 0 },
    "57_24": { "type": "dark", "perilous": 0 },
    "56_23": { "type": "dark", "perilous": 0 },
    "55_25": { "type": "dark", "perilous": 0 },
    "55_26": { "type": "dark", "perilous": 0 },
    "54_27": { "type": "dark", "perilous": 0 },
    "54_28": { "type": "dark", "perilous": 0 },
    "55_28": { "type": "dark", "perilous": 0 },
    "53_27": { "type": "dark", "perilous": 0 },
    "53_29": { "type": "dark", "perilous": 0 },
    "53_30": { "type": "dark", "perilous": 0 },
    "54_30": { "type": "dark", "perilous": 0 },
    "53_31": { "type": "dark", "perilous": 0 },
    "53_32": { "type": "dark", "perilous": 0 },
    "53_33": { "type": "dark", "perilous": 0 },
    "54_34": { "type": "dark", "perilous": 0 },
    "54_35": { "type": "dark", "perilous": 0 },
    "55_35": { "type": "dark", "perilous": 0 },
    "56_36": { "type": "dark", "perilous": 0 },
    "55_39": { "type": "dark", "perilous": 0 },
    "56_39": { "type": "dark", "perilous": 0 },
    "57_38": { "type": "dark", "perilous": 0 },
    "56_37": { "type": "dark", "perilous": 0 },
    "56_38": { "type": "dark", "perilous": 0 },
    "55_37": { "type": "dark", "perilous": 0 },
    "54_37": { "type": "dark", "perilous": 0 },
    "55_38": { "type": "dark", "perilous": 0 },
    "54_39": { "type": "dark", "perilous": 0 },
    "54_38": { "type": "dark", "perilous": 0 },
    "55_40": { "type": "dark", "perilous": 0 },
    "54_40": { "type": "dark", "perilous": 0 },
    "50_41": { "type": "dark", "perilous": 0 },
    "51_41": { "type": "dark", "perilous": 0 },
    "52_41": { "type": "dark", "perilous": 0 },
    "53_41": { "type": "dark", "perilous": 0 },
    "53_40": { "type": "dark", "perilous": 0 },
    "51_40": { "type": "dark", "perilous": 0 },
    "51_39": { "type": "dark", "perilous": 0 },
    "52_40": { "type": "dark", "perilous": 0 },
    "50_39": { "type": "dark", "perilous": 0 },
    "52_39": { "type": "dark", "perilous": 0 },
    "53_39": { "type": "dark", "perilous": 0 },
    "51_38": { "type": "dark", "perilous": 0 },
    "52_38": { "type": "dark", "perilous": 0 },
    "53_38": { "type": "dark", "perilous": 0 },
    "52_37": { "type": "dark", "perilous": 0 },
    "53_37": { "type": "dark", "perilous": 0 },
    "54_36": { "type": "dark", "perilous": 0 },
    "55_36": { "type": "dark", "perilous": 0 },
    "52_31": { "type": "dark", "perilous": 0 },
    "52_32": { "type": "dark", "perilous": 0 },
    "52_33": { "type": "dark", "perilous": 0 },
    "53_34": { "type": "dark", "perilous": 0 },
    "53_35": { "type": "dark", "perilous": 0 },
    "53_36": { "type": "dark", "perilous": 0 },
    "51_37": { "type": "dark", "perilous": 0 },
    "52_36": { "type": "dark", "perilous": 0 },
    "52_35": { "type": "dark", "perilous": 0 },
    "52_34": { "type": "dark", "perilous": 0 },
    "51_33": { "type": "dark", "perilous": 0 },
    "51_34": { "type": "dark", "perilous": 0 },
    "51_35": { "type": "dark", "perilous": 0 },
    "50_28": { "type": "dark", "perilous": 0 },
    "51_28": { "type": "dark", "perilous": 0 },
    "50_30": { "type": "dark", "perilous": 0 },
    "50_29": { "type": "dark", "perilous": 0 },
    "49_31": { "type": "dark", "perilous": 0 },
    "50_31": { "type": "dark", "perilous": 0 },
    "51_30": { "type": "dark", "perilous": 0 },
    "49_32": { "type": "dark", "perilous": 0 },
    "50_32": { "type": "dark", "perilous": 0 },
    "49_33": { "type": "dark", "perilous": 0 },
    "48_33": { "type": "dark", "perilous": 0 },
    "49_34": { "type": "dark", "perilous": 0 },
    "48_34": { "type": "dark", "perilous": 0 },
    "46_35": { "type": "dark", "perilous": 0 },
    "47_35": { "type": "dark", "perilous": 0 },
    "47_36": { "type": "dark", "perilous": 0 },
    "46_36": { "type": "dark", "perilous": 0 },
    "45_37": { "type": "dark", "perilous": 0 },
    "46_38": { "type": "dark", "perilous": 0 },
    "47_38": { "type": "dark", "perilous": 0 },
    "46_39": { "type": "dark", "perilous": 0 },
    "47_40": { "type": "dark", "perilous": 0 },
    "47_39": { "type": "dark", "perilous": 0 },
    "46_37": { "type": "dark", "perilous": 0 },
    "47_37": { "type": "dark", "perilous": 0 },
    "48_36": { "type": "dark", "perilous": 0 },
    "48_38": { "type": "dark", "perilous": 0 },
    "48_37": { "type": "dark", "perilous": 0 },
    "34_37": { "type": "dark", "perilous": 0 },
    "35_38": { "type": "dark", "perilous": 0 },
    "34_39": { "type": "dark", "perilous": 0 },
    "33_40": { "type": "dark", "perilous": 0 },
    "32_41": { "type": "dark", "perilous": 0 },
    "33_41": { "type": "dark", "perilous": 0 },
    "34_40": { "type": "dark", "perilous": 0 },
    "35_40": { "type": "dark", "perilous": 0 },
    "34_41": { "type": "dark", "perilous": 0 },
    "35_41": { "type": "dark", "perilous": 0 },
    "36_41": { "type": "dark", "perilous": 0 },
    "40_41": { "type": "dark", "perilous": 0 },
    "41_41": { "type": "dark", "perilous": 0 },
    "42_41": { "type": "dark", "perilous": 0 },
    "42_40": { "type": "dark", "perilous": 0 },
    "56_25": { "type": "wild", "perilous": 0 },
    "56_26": { "type": "wild", "perilous": 0 },
    "55_27": { "type": "wild", "perilous": 0 },
    "56_27": { "type": "wild", "perilous": 0 },
    "56_28": { "type": "wild", "perilous": 0 },
    "54_29": { "type": "wild", "perilous": 0 },
    "55_29": { "type": "wild", "perilous": 0 },
    "56_29": { "type": "wild", "perilous": 0 },
    "55_30": { "type": "wild", "perilous": 0 },
    "56_30": { "type": "wild", "perilous": 0 },
    "54_31": { "type": "wild", "perilous": 0 },
    "55_31": { "type": "wild", "perilous": 0 },
    "56_31": { "type": "wild", "perilous": 0 },
    "54_32": { "type": "wild", "perilous": 0 },
    "55_32": { "type": "wild", "perilous": 0 },
    "56_32": { "type": "wild", "perilous": 0 },
    "54_33": { "type": "wild", "perilous": 0 },
    "55_33": { "type": "wild", "perilous": 0 },
    "56_33": { "type": "wild", "perilous": 0 },
    "55_34": { "type": "wild", "perilous": 0 },
    "56_34": { "type": "wild", "perilous": 0 },
    "56_35": { "type": "wild", "perilous": 0 },
    "54_41": { "type": "wild", "perilous": 0 },
    "55_41": { "type": "wild", "perilous": 0 },
    "56_41": { "type": "wild", "perilous": 0 },
    "56_40": { "type": "dark", "perilous": 0 },
    "44_41": { "type": "wild", "perilous": 0 },
    "45_41": { "type": "wild", "perilous": 0 },
    "44_40": { "type": "wild", "perilous": 0 },
    "45_40": { "type": "wild", "perilous": 0 },
    "43_39": { "type": "wild", "perilous": 0 },
    "44_39": { "type": "wild", "perilous": 0 },
    "43_38": { "type": "wild", "perilous": 0 },
    "44_38": { "type": "wild", "perilous": 0 },
    "30_8": { "type": "dark", "perilous": 0 },
    "29_9": { "type": "dark", "perilous": 0 },
    "30_9": { "type": "dark", "perilous": 0 },
    "31_9": { "type": "dark", "perilous": 0 },
    "32_10": { "type": "dark", "perilous": 0 },
    "31_10": { "type": "dark", "perilous": 0 },
    "31_11": { "type": "dark", "perilous": 0 },
    "30_11": { "type": "dark", "perilous": 0 },
    "30_10": { "type": "dark", "perilous": 0 },
    "29_11": { "type": "dark", "perilous": 0 },
    "30_12": { "type": "dark", "perilous": 0 },
    "29_12": { "type": "dark", "perilous": 0 },
    "29_13": { "type": "dark", "perilous": 0 },
    "28_13": { "type": "dark", "perilous": 0 },
    "29_14": { "type": "dark", "perilous": 0 },
    "30_13": { "type": "dark", "perilous": 0 },
    "31_12": { "type": "dark", "perilous": 0 },
    "32_12": { "type": "dark", "perilous": 0 },
    "31_13": { "type": "dark", "perilous": 0 },
    "32_13": { "type": "dark", "perilous": 0 },
    "33_14": { "type": "dark", "perilous": 0 },
    "33_13": { "type": "dark", "perilous": 0 },
    "33_12": { "type": "dark", "perilous": 0 },
    "32_11": { "type": "dark", "perilous": 0 },
    "33_10": { "type": "dark", "perilous": 0 },
    "34_10": { "type": "dark", "perilous": 0 },
    "33_11": { "type": "dark", "perilous": 0 },
    "35_10": { "type": "dark", "perilous": 0 },
    "34_11": { "type": "dark", "perilous": 0 },
    "34_12": { "type": "dark", "perilous": 0 },
    "34_13": { "type": "dark", "perilous": 0 },
    "35_12": { "type": "dark", "perilous": 0 },
    "35_13": { "type": "dark", "perilous": 0 },
    "35_11": { "type": "dark", "perilous": 0 },
    "36_11": { "type": "dark", "perilous": 0 },
    "36_10": { "type": "dark", "perilous": 0 },
    "36_12": { "type": "dark", "perilous": 0 },
    "37_12": { "type": "dark", "perilous": 0 },
    "37_11": { "type": "dark", "perilous": 0 },
    "37_10": { "type": "dark", "perilous": 0 },
    "37_9": { "type": "dark", "perilous": 0 },
    "38_10": { "type": "dark", "perilous": 0 },
    "39_10": { "type": "dark", "perilous": 0 },
    "38_11": { "type": "dark", "perilous": 0 },
    "38_12": { "type": "dark", "perilous": 0 },
    "39_12": { "type": "dark", "perilous": 0 },
    "38_13": { "type": "dark", "perilous": 0 },
    "39_13": { "type": "dark", "perilous": 0 },
    "39_14": { "type": "dark", "perilous": 0 },
    "40_14": { "type": "dark", "perilous": 0 },
    "39_15": { "type": "dark", "perilous": 0 },
    "40_15": { "type": "dark", "perilous": 0 },
    "41_16": { "type": "dark", "perilous": 0 },
    "41_15": { "type": "dark", "perilous": 0 },
    "42_16": { "type": "dark", "perilous": 0 },
    "41_17": { "type": "dark", "perilous": 0 },
    "40_17": { "type": "dark", "perilous": 0 },
    "40_16": { "type": "dark", "perilous": 0 },
    "39_16": { "type": "dark", "perilous": 0 },
    "39_17": { "type": "dark", "perilous": 0 },
    "23_3": { "type": "wild", "perilous": 0 },
    "23_4": { "type": "wild", "perilous": 0 },
    "24_4": { "type": "wild", "perilous": 0 },
    "25_4": { "type": "wild", "perilous": 0 },
    "23_5": { "type": "wild", "perilous": 0 },
    "24_5": { "type": "wild", "perilous": 0 },
    "25_5": { "type": "wild", "perilous": 0 },
    "26_5": { "type": "wild", "perilous": 0 },
    "27_5": { "type": "wild", "perilous": 0 },
    "27_6": { "type": "wild", "perilous": 0 },
    "26_6": { "type": "wild", "perilous": 0 },
    "25_6": { "type": "wild", "perilous": 0 },
    "24_6": { "type": "wild", "perilous": 0 },
    "23_6": { "type": "wild", "perilous": 0 },
    "22_7": { "type": "wild", "perilous": 0 },
    "23_7": { "type": "wild", "perilous": 0 },
    "24_7": { "type": "wild", "perilous": 0 },
    "25_7": { "type": "wild", "perilous": 0 },
    "26_7": { "type": "wild", "perilous": 0 },
    "27_8": { "type": "wild", "perilous": 0 },
    "26_8": { "type": "wild", "perilous": 0 },
    "25_8": { "type": "wild", "perilous": 0 },
    "24_8": { "type": "wild", "perilous": 0 },
    "23_8": { "type": "wild", "perilous": 0 },
    "22_8": { "type": "wild", "perilous": 0 },
    "22_9": { "type": "wild", "perilous": 0 },
    "23_9": { "type": "wild", "perilous": 0 },
    "24_9": { "type": "wild", "perilous": 0 },
    "25_9": { "type": "wild", "perilous": 0 },
    "26_9": { "type": "wild", "perilous": 0 },
    "27_9": { "type": "wild", "perilous": 0 },
    "28_10": { "type": "wild", "perilous": 0 },
    "27_10": { "type": "wild", "perilous": 0 },
    "26_10": { "type": "wild", "perilous": 0 },
    "25_10": { "type": "wild", "perilous": 0 },
    "24_10": { "type": "wild", "perilous": 0 },
    "23_10": { "type": "wild", "perilous": 0 },
    "22_11": { "type": "wild", "perilous": 0 },
    "23_11": { "type": "wild", "perilous": 0 },
    "24_11": { "type": "wild", "perilous": 0 },
    "25_11": { "type": "wild", "perilous": 0 },
    "26_11": { "type": "wild", "perilous": 0 },
    "27_11": { "type": "wild", "perilous": 0 },
    "26_12": { "type": "wild", "perilous": 0 },
    "27_12": { "type": "wild", "perilous": 0 },
    "25_12": { "type": "wild", "perilous": 0 },
    "24_12": { "type": "wild", "perilous": 0 },
    "23_12": { "type": "wild", "perilous": 0 },
    "22_12": { "type": "wild", "perilous": 0 },
    "22_13": { "type": "wild", "perilous": 0 },
    "23_13": { "type": "wild", "perilous": 0 },
    "24_13": { "type": "wild", "perilous": 0 },
    "25_13": { "type": "wild", "perilous": 0 },
    "26_13": { "type": "wild", "perilous": 0 },
    "22_14": { "type": "wild", "perilous": 0 },
    "23_14": { "type": "wild", "perilous": 0 },
    "24_14": { "type": "wild", "perilous": 0 },
    "25_14": { "type": "wild", "perilous": 0 },
    "26_14": { "type": "wild", "perilous": 0 },
    "27_14": { "type": "wild", "perilous": 0 },
    "22_16": { "type": "wild", "perilous": 0 },
    "22_15": { "type": "wild", "perilous": 0 },
    "23_15": { "type": "wild", "perilous": 0 },
    "24_15": { "type": "wild", "perilous": 0 },
    "25_15": { "type": "wild", "perilous": 0 },
    "26_15": { "type": "wild", "perilous": 0 },
    "25_16": { "type": "wild", "perilous": 0 },
    "26_16": { "type": "wild", "perilous": 0 },
    "27_16": { "type": "wild", "perilous": 0 },
    "28_16": { "type": "wild", "perilous": 0 },
    "26_17": { "type": "wild", "perilous": 0 },
    "29_4": { "type": "wild", "perilous": 0 },
    "28_5": { "type": "wild", "perilous": 0 },
    "29_5": { "type": "wild", "perilous": 0 },
    "29_6": { "type": "wild", "perilous": 0 },
    "30_6": { "type": "wild", "perilous": 0 },
    "30_5": { "type": "wild", "perilous": 0 },
    "30_4": { "type": "wild", "perilous": 0 },
    "31_4": { "type": "wild", "perilous": 0 },
    "32_4": { "type": "wild", "perilous": 0 },
    "33_4": { "type": "wild", "perilous": 0 },
    "34_4": { "type": "wild", "perilous": 0 },
    "35_4": { "type": "wild", "perilous": 0 },
    "36_4": { "type": "wild", "perilous": 0 },
    "37_4": { "type": "wild", "perilous": 0 },
    "38_4": { "type": "wild", "perilous": 0 },
    "39_4": { "type": "wild", "perilous": 0 },
    "31_5": { "type": "wild", "perilous": 0 },
    "32_5": { "type": "wild", "perilous": 0 },
    "33_5": { "type": "wild", "perilous": 0 },
    "34_5": { "type": "wild", "perilous": 0 },
    "35_5": { "type": "wild", "perilous": 0 },
    "36_5": { "type": "wild", "perilous": 0 },
    "37_5": { "type": "wild", "perilous": 0 },
    "38_5": { "type": "wild", "perilous": 0 },
    "39_5": { "type": "wild", "perilous": 0 },
    "40_5": { "type": "wild", "perilous": 0 },
    "31_6": { "type": "wild", "perilous": 0 },
    "32_6": { "type": "wild", "perilous": 0 },
    "33_6": { "type": "wild", "perilous": 0 },
    "34_6": { "type": "wild", "perilous": 0 },
    "35_6": { "type": "wild", "perilous": 0 },
    "36_6": { "type": "wild", "perilous": 0 },
    "37_6": { "type": "wild", "perilous": 0 },
    "38_6": { "type": "wild", "perilous": 0 },
    "39_6": { "type": "wild", "perilous": 0 },
    "40_6": { "type": "wild", "perilous": 0 },
    "41_6": { "type": "wild", "perilous": 0 },
    "42_6": { "type": "wild", "perilous": 0 },
    "43_6": { "type": "wild", "perilous": 0 },
    "44_6": { "type": "wild", "perilous": 0 },
    "45_6": { "type": "wild", "perilous": 0 },
    "45_7": { "type": "wild", "perilous": 0 },
    "44_7": { "type": "wild", "perilous": 0 },
    "43_7": { "type": "wild", "perilous": 0 },
    "42_7": { "type": "wild", "perilous": 0 },
    "41_7": { "type": "wild", "perilous": 0 },
    "40_7": { "type": "wild", "perilous": 0 },
    "39_7": { "type": "wild", "perilous": 0 },
    "38_7": { "type": "wild", "perilous": 0 },
    "37_7": { "type": "wild", "perilous": 0 },
    "36_7": { "type": "wild", "perilous": 0 },
    "35_7": { "type": "wild", "perilous": 0 },
    "34_7": { "type": "wild", "perilous": 0 },
    "33_7": { "type": "wild", "perilous": 0 },
    "32_7": { "type": "wild", "perilous": 0 },
    "31_7": { "type": "wild", "perilous": 0 },
    "33_8": { "type": "wild", "perilous": 0 },
    "34_8": { "type": "wild", "perilous": 0 },
    "35_8": { "type": "wild", "perilous": 0 },
    "36_8": { "type": "wild", "perilous": 0 },
    "41_8": { "type": "wild", "perilous": 0 },
    "42_8": { "type": "wild", "perilous": 0 },
    "43_8": { "type": "wild", "perilous": 0 },
    "44_8": { "type": "wild", "perilous": 0 },
    "45_8": { "type": "wild", "perilous": 0 },
    "41_9": { "type": "wild", "perilous": 0 },
    "42_9": { "type": "wild", "perilous": 0 },
    "43_9": { "type": "wild", "perilous": 0 },
    "44_9": { "type": "wild", "perilous": 0 },
    "45_9": { "type": "wild", "perilous": 0 },
    "43_10": { "type": "wild", "perilous": 0 },
    "44_10": { "type": "wild", "perilous": 0 },
    "45_10": { "type": "wild", "perilous": 0 },
    "46_10": { "type": "wild", "perilous": 0 },
    "47_10": { "type": "wild", "perilous": 0 },
    "42_11": { "type": "wild", "perilous": 0 },
    "43_11": { "type": "wild", "perilous": 0 },
    "44_11": { "type": "wild", "perilous": 0 },
    "45_11": { "type": "wild", "perilous": 0 },
    "46_11": { "type": "wild", "perilous": 0 },
    "47_11": { "type": "wild", "perilous": 0 },
    "41_12": { "type": "wild", "perilous": 0 },
    "42_12": { "type": "wild", "perilous": 0 },
    "43_12": { "type": "wild", "perilous": 0 },
    "44_12": { "type": "wild", "perilous": 0 },
    "45_12": { "type": "wild", "perilous": 0 },
    "46_12": { "type": "wild", "perilous": 0 },
    "47_12": { "type": "wild", "perilous": 0 },
    "41_13": { "type": "wild", "perilous": 0 },
    "42_13": { "type": "wild", "perilous": 0 },
    "43_13": { "type": "wild", "perilous": 0 },
    "44_13": { "type": "wild", "perilous": 0 },
    "45_13": { "type": "wild", "perilous": 0 },
    "46_13": { "type": "wild", "perilous": 0 },
    "43_14": { "type": "wild", "perilous": 0 },
    "44_14": { "type": "wild", "perilous": 0 },
    "45_14": { "type": "wild", "perilous": 0 },
    "43_15": { "type": "wild", "perilous": 0 },
    "44_15": { "type": "wild", "perilous": 0 },
    "44_16": { "type": "wild", "perilous": 0 },
    "45_16": { "type": "wild", "perilous": 0 },
    "43_17": { "type": "wild", "perilous": 0 },
    "44_17": { "type": "wild", "perilous": 0 },
    "45_17": { "type": "wild", "perilous": 0 },
    "46_17": { "type": "wild", "perilous": 0 },
    "47_17": { "type": "wild", "perilous": 0 },
    "44_18": { "type": "wild", "perilous": 0 },
    "45_18": { "type": "wild", "perilous": 0 },
    "46_18": { "type": "wild", "perilous": 0 },
    "47_18": { "type": "wild", "perilous": 0 },
    "48_18": { "type": "wild", "perilous": 0 },
    "49_18": { "type": "wild", "perilous": 0 },
    "38_19": { "type": "wild", "perilous": 0 },
    "39_19": { "type": "wild", "perilous": 0 },
    "40_19": { "type": "wild", "perilous": 0 },
    "41_19": { "type": "wild", "perilous": 0 },
    "42_19": { "type": "wild", "perilous": 0 },
    "43_19": { "type": "wild", "perilous": 0 },
    "44_19": { "type": "wild", "perilous": 0 },
    "45_19": { "type": "wild", "perilous": 0 },
    "46_19": { "type": "wild", "perilous": 0 },
    "47_19": { "type": "wild", "perilous": 0 },
    "34_15": { "type": "wild", "perilous": 0 },
    "35_15": { "type": "wild", "perilous": 0 },
    "36_15": { "type": "wild", "perilous": 0 },
    "37_14": { "type": "wild", "perilous": 0 },
    "37_15": { "type": "wild", "perilous": 0 },
    "34_16": { "type": "wild", "perilous": 0 },
    "35_16": { "type": "wild", "perilous": 0 },
    "36_16": { "type": "wild", "perilous": 0 },
    "37_16": { "type": "wild", "perilous": 0 },
    "34_17": { "type": "wild", "perilous": 0 },
    "35_17": { "type": "wild", "perilous": 0 },
    "36_17": { "type": "wild", "perilous": 0 },
    "37_17": { "type": "wild", "perilous": 0 },
    "38_18": { "type": "wild", "perilous": 0 },
    "43_20": { "type": "wild", "perilous": 0 },
    "44_20": { "type": "wild", "perilous": 0 },
    "45_20": { "type": "wild", "perilous": 0 },
    "46_20": { "type": "wild", "perilous": 0 },
    "47_20": { "type": "wild", "perilous": 0 },
    "48_20": { "type": "wild", "perilous": 0 },
    "44_21": { "type": "wild", "perilous": 0 },
    "45_21": { "type": "wild", "perilous": 0 },
    "46_21": { "type": "wild", "perilous": 0 },
    "47_21": { "type": "wild", "perilous": 0 },
    "48_21": { "type": "wild", "perilous": 0 },
    "44_22": { "type": "wild", "perilous": 0 },
    "46_22": { "type": "wild", "perilous": 0 },
    "45_22": { "type": "wild", "perilous": 0 },
    "47_22": { "type": "wild", "perilous": 0 },
    "48_22": { "type": "wild", "perilous": 0 },
    "49_22": { "type": "wild", "perilous": 0 },
    "50_22": { "type": "wild", "perilous": 0 },
    "40_23": { "type": "wild", "perilous": 0 },
    "41_23": { "type": "wild", "perilous": 0 },
    "42_23": { "type": "wild", "perilous": 0 },
    "43_23": { "type": "wild", "perilous": 0 },
    "44_23": { "type": "wild", "perilous": 0 },
    "45_23": { "type": "wild", "perilous": 0 },
    "46_23": { "type": "wild", "perilous": 0 },
    "47_23": { "type": "wild", "perilous": 0 },
    "48_23": { "type": "wild", "perilous": 0 },
    "49_23": { "type": "wild", "perilous": 0 },
    "50_23": { "type": "wild", "perilous": 0 },
    "37_23": { "type": "wild", "perilous": 0 },
    "38_23": { "type": "wild", "perilous": 0 },
    "35_23": { "type": "wild", "perilous": 0 },
    "25_22": { "type": "wild", "perilous": 0 },
    "26_22": { "type": "wild", "perilous": 0 },
    "27_22": { "type": "wild", "perilous": 0 },
    "28_22": { "type": "wild", "perilous": 0 },
    "24_23": { "type": "wild", "perilous": 0 },
    "25_23": { "type": "wild", "perilous": 0 },
    "26_23": { "type": "wild", "perilous": 0 },
    "27_23": { "type": "wild", "perilous": 0 },
    "28_23": { "type": "wild", "perilous": 0 },
    "25_24": { "type": "wild", "perilous": 0 },
    "26_24": { "type": "wild", "perilous": 0 },
    "27_24": { "type": "wild", "perilous": 0 },
    "28_24": { "type": "wild", "perilous": 0 },
    "29_24": { "type": "wild", "perilous": 0 },
    "30_24": { "type": "wild", "perilous": 0 },
    "31_24": { "type": "wild", "perilous": 0 },
    "32_24": { "type": "wild", "perilous": 0 },
    "33_24": { "type": "wild", "perilous": 0 },
    "33_25": { "type": "wild", "perilous": 0 },
    "34_24": { "type": "wild", "perilous": 0 },
    "34_25": { "type": "wild", "perilous": 0 },
    "35_24": { "type": "wild", "perilous": 0 },
    "35_25": { "type": "wild", "perilous": 0 },
    "36_24": { "type": "wild", "perilous": 0 },
    "37_24": { "type": "wild", "perilous": 0 },
    "38_24": { "type": "wild", "perilous": 0 },
    "39_24": { "type": "wild", "perilous": 0 },
    "40_24": { "type": "wild", "perilous": 0 },
    "41_24": { "type": "wild", "perilous": 0 },
    "42_24": { "type": "wild", "perilous": 0 },
    "46_24": { "type": "wild", "perilous": 0 },
    "43_24": { "type": "wild", "perilous": 0 },
    "44_24": { "type": "wild", "perilous": 0 },
    "45_24": { "type": "wild", "perilous": 0 },
    "47_24": { "type": "wild", "perilous": 0 },
    "49_24": { "type": "wild", "perilous": 0 },
    "48_24": { "type": "wild", "perilous": 0 },
    "50_24": { "type": "wild", "perilous": 0 },
    "31_25": { "type": "wild", "perilous": 0 },
    "30_25": { "type": "wild", "perilous": 0 },
    "32_25": { "type": "wild", "perilous": 0 },
    "36_25": { "type": "wild", "perilous": 0 },
    "37_25": { "type": "wild", "perilous": 0 },
    "38_25": { "type": "wild", "perilous": 0 },
    "39_25": { "type": "wild", "perilous": 0 },
    "40_25": { "type": "wild", "perilous": 0 },
    "41_25": { "type": "wild", "perilous": 0 },
    "42_25": { "type": "wild", "perilous": 0 },
    "43_25": { "type": "wild", "perilous": 0 },
    "44_25": { "type": "wild", "perilous": 0 },
    "45_25": { "type": "wild", "perilous": 0 },
    "46_25": { "type": "wild", "perilous": 0 },
    "47_25": { "type": "wild", "perilous": 0 },
    "48_25": { "type": "wild", "perilous": 0 },
    "49_25": { "type": "wild", "perilous": 0 },
    "30_26": { "type": "wild", "perilous": 0 },
    "31_26": { "type": "wild", "perilous": 0 },
    "32_26": { "type": "wild", "perilous": 0 },
    "33_26": { "type": "wild", "perilous": 0 },
    "34_26": { "type": "wild", "perilous": 0 },
    "35_26": { "type": "wild", "perilous": 0 },
    "36_26": { "type": "wild", "perilous": 0 },
    "37_26": { "type": "wild", "perilous": 0 },
    "38_26": { "type": "wild", "perilous": 0 },
    "39_26": { "type": "wild", "perilous": 0 },
    "40_26": { "type": "wild", "perilous": 0 },
    "41_26": { "type": "wild", "perilous": 0 },
    "42_26": { "type": "wild", "perilous": 0 },
    "43_26": { "type": "wild", "perilous": 0 },
    "44_26": { "type": "wild", "perilous": 0 },
    "45_26": { "type": "wild", "perilous": 0 },
    "46_26": { "type": "wild", "perilous": 0 },
    "47_26": { "type": "wild", "perilous": 0 },
    "48_26": { "type": "wild", "perilous": 0 },
    "49_26": { "type": "wild", "perilous": 0 },
    "26_27": { "type": "wild", "perilous": 0 },
    "27_27": { "type": "wild", "perilous": 0 },
    "28_27": { "type": "wild", "perilous": 0 },
    "29_27": { "type": "wild", "perilous": 0 },
    "27_28": { "type": "wild", "perilous": 0 },
    "28_28": { "type": "wild", "perilous": 0 },
    "29_28": { "type": "wild", "perilous": 0 },
    "30_27": { "type": "wild", "perilous": 0 },
    "31_27": { "type": "wild", "perilous": 0 },
    "32_27": { "type": "wild", "perilous": 0 },
    "33_27": { "type": "wild", "perilous": 0 },
    "34_27": { "type": "wild", "perilous": 0 },
    "35_27": { "type": "wild", "perilous": 0 },
    "36_27": { "type": "wild", "perilous": 0 },
    "37_27": { "type": "wild", "perilous": 0 },
    "38_27": { "type": "wild", "perilous": 0 },
    "39_27": { "type": "wild", "perilous": 0 },
    "40_27": { "type": "wild", "perilous": 0 },
    "41_27": { "type": "wild", "perilous": 0 },
    "42_27": { "type": "wild", "perilous": 0 },
    "44_27": { "type": "wild", "perilous": 0 },
    "45_27": { "type": "wild", "perilous": 0 },
    "46_27": { "type": "wild", "perilous": 0 },
    "47_27": { "type": "wild", "perilous": 0 },
    "48_27": { "type": "wild", "perilous": 0 },
    "46_28": { "type": "wild", "perilous": 0 },
    "47_28": { "type": "wild", "perilous": 0 },
    "46_29": { "type": "wild", "perilous": 0 },
    "46_30": { "type": "wild", "perilous": 0 },
    "47_30": { "type": "wild", "perilous": 0 },
    "48_30": { "type": "wild", "perilous": 0 },
    "31_28": { "type": "wild", "perilous": 0 },
    "32_28": { "type": "wild", "perilous": 0 },
    "33_28": { "type": "wild", "perilous": 0 },
    "34_28": { "type": "wild", "perilous": 0 },
    "35_28": { "type": "wild", "perilous": 0 },
    "36_28": { "type": "wild", "perilous": 0 },
    "37_28": { "type": "wild", "perilous": 0 },
    "38_28": { "type": "wild", "perilous": 0 },
    "39_28": { "type": "wild", "perilous": 0 },
    "40_28": { "type": "wild", "perilous": 0 },
    "41_28": { "type": "wild", "perilous": 0 },
    "42_28": { "type": "wild", "perilous": 0 },
    "31_29": { "type": "wild", "perilous": 0 },
    "32_29": { "type": "wild", "perilous": 0 },
    "33_29": { "type": "wild", "perilous": 0 },
    "34_29": { "type": "wild", "perilous": 0 },
    "35_29": { "type": "wild", "perilous": 0 },
    "36_29": { "type": "wild", "perilous": 0 },
    "37_29": { "type": "wild", "perilous": 0 },
    "38_29": { "type": "wild", "perilous": 0 },
    "39_29": { "type": "wild", "perilous": 0 },
    "40_29": { "type": "wild", "perilous": 0 },
    "41_29": { "type": "wild", "perilous": 0 },
    "31_30": { "type": "wild", "perilous": 0 },
    "32_30": { "type": "wild", "perilous": 0 },
    "33_30": { "type": "wild", "perilous": 0 },
    "34_30": { "type": "wild", "perilous": 0 },
    "35_30": { "type": "wild", "perilous": 0 },
    "36_30": { "type": "wild", "perilous": 0 },
    "37_30": { "type": "wild", "perilous": 0 },
    "38_30": { "type": "wild", "perilous": 0 },
    "39_30": { "type": "wild", "perilous": 0 },
    "40_30": { "type": "wild", "perilous": 0 },
    "41_30": { "type": "wild", "perilous": 0 },
    "42_30": { "type": "wild", "perilous": 0 },
    "28_30": { "type": "wild", "perilous": 0 },
    "29_30": { "type": "wild", "perilous": 0 },
    "28_31": { "type": "wild", "perilous": 0 },
    "29_32": { "type": "wild", "perilous": 0 },
    "28_32": { "type": "wild", "perilous": 0 },
    "27_33": { "type": "wild", "perilous": 0 },
    "26_33": { "type": "wild", "perilous": 0 },
    "27_34": { "type": "wild", "perilous": 0 },
    "26_35": { "type": "wild", "perilous": 0 },
    "26_34": { "type": "wild", "perilous": 0 },
    "26_36": { "type": "wild", "perilous": 0 },
    "25_35": { "type": "wild", "perilous": 0 },
    "28_33": { "type": "wild", "perilous": 0 },
    "29_33": { "type": "wild", "perilous": 0 },
    "28_34": { "type": "wild", "perilous": 0 },
    "29_34": { "type": "wild", "perilous": 0 },
    "27_36": { "type": "wild", "perilous": 0 },
    "27_35": { "type": "wild", "perilous": 0 },
    "26_37": { "type": "wild", "perilous": 0 },
    "26_38": { "type": "wild", "perilous": 0 },
    "25_37": { "type": "wild", "perilous": 0 },
    "28_35": { "type": "wild", "perilous": 0 },
    "29_36": { "type": "wild", "perilous": 0 },
    "28_37": { "type": "wild", "perilous": 0 },
    "28_39": { "type": "wild", "perilous": 0 },
    "29_40": { "type": "wild", "perilous": 0 },
    "29_41": { "type": "wild", "perilous": 0 },
    "30_38": { "type": "wild", "perilous": 0 },
    "30_37": { "type": "wild", "perilous": 0 },
    "31_36": { "type": "wild", "perilous": 0 },
    "30_35": { "type": "wild", "perilous": 0 },
    "31_34": { "type": "wild", "perilous": 0 },
    "31_33": { "type": "wild", "perilous": 0 },
    "30_31": { "type": "wild", "perilous": 0 },
    "31_31": { "type": "wild", "perilous": 0 },
    "32_31": { "type": "wild", "perilous": 0 },
    "33_31": { "type": "wild", "perilous": 0 },
    "34_31": { "type": "wild", "perilous": 0 },
    "35_31": { "type": "wild", "perilous": 0 },
    "36_31": { "type": "wild", "perilous": 0 },
    "37_31": { "type": "wild", "perilous": 0 },
    "38_31": { "type": "wild", "perilous": 0 },
    "39_31": { "type": "wild", "perilous": 0 },
    "40_31": { "type": "wild", "perilous": 0 },
    "41_31": { "type": "wild", "perilous": 0 },
    "42_31": { "type": "wild", "perilous": 0 },
    "43_31": { "type": "wild", "perilous": 0 },
    "44_31": { "type": "wild", "perilous": 0 },
    "45_31": { "type": "wild", "perilous": 0 },
    "47_31": { "type": "wild", "perilous": 0 },
    "46_31": { "type": "wild", "perilous": 0 },
    "47_32": { "type": "wild", "perilous": 0 },
    "46_32": { "type": "wild", "perilous": 0 },
    "46_33": { "type": "wild", "perilous": 0 },
    "45_33": { "type": "wild", "perilous": 0 },
    "45_34": { "type": "wild", "perilous": 0 },
    "44_35": { "type": "wild", "perilous": 0 },
    "44_36": { "type": "wild", "perilous": 0 },
    "43_36": { "type": "wild", "perilous": 0 },
    "43_37": { "type": "wild", "perilous": 0 },
    "42_37": { "type": "wild", "perilous": 0 },
    "41_37": { "type": "wild", "perilous": 0 },
    "41_38": { "type": "wild", "perilous": 0 },
    "40_39": { "type": "wild", "perilous": 0 },
    "39_39": { "type": "wild", "perilous": 0 },
    "39_40": { "type": "wild", "perilous": 0 },
    "38_40": { "type": "wild", "perilous": 0 },
    "36_39": { "type": "wild", "perilous": 0 },
    "37_39": { "type": "wild", "perilous": 0 },
    "36_37": { "type": "wild", "perilous": 0 },
    "37_38": { "type": "wild", "perilous": 0 },
    "36_36": { "type": "wild", "perilous": 0 },
    "35_35": { "type": "wild", "perilous": 0 },
    "34_35": { "type": "wild", "perilous": 0 },
    "33_35": { "type": "wild", "perilous": 0 },
    "33_36": { "type": "wild", "perilous": 0 },
    "32_37": { "type": "wild", "perilous": 0 },
    "32_38": { "type": "wild", "perilous": 0 },
    "32_39": { "type": "wild", "perilous": 0 },
    "32_40": { "type": "wild", "perilous": 0 },
    "31_40": { "type": "wild", "perilous": 0 },
    "31_39": { "type": "wild", "perilous": 0 },
    "30_39": { "type": "wild", "perilous": 0 },
    "31_38": { "type": "wild", "perilous": 0 },
    "31_37": { "type": "wild", "perilous": 0 },
    "32_36": { "type": "wild", "perilous": 0 },
    "32_35": { "type": "wild", "perilous": 0 },
    "31_35": { "type": "wild", "perilous": 0 },
    "32_34": { "type": "wild", "perilous": 0 },
    "33_34": { "type": "wild", "perilous": 0 },
    "34_34": { "type": "wild", "perilous": 0 },
    "35_34": { "type": "wild", "perilous": 0 },
    "36_34": { "type": "wild", "perilous": 0 },
    "36_35": { "type": "wild", "perilous": 0 },
    "37_36": { "type": "wild", "perilous": 0 },
    "37_37": { "type": "wild", "perilous": 0 },
    "38_38": { "type": "wild", "perilous": 0 },
    "38_39": { "type": "wild", "perilous": 0 },
    "39_38": { "type": "wild", "perilous": 0 },
    "38_37": { "type": "wild", "perilous": 0 },
    "39_37": { "type": "wild", "perilous": 0 },
    "40_38": { "type": "wild", "perilous": 0 },
    "40_37": { "type": "wild", "perilous": 0 },
    "41_36": { "type": "wild", "perilous": 0 },
    "41_35": { "type": "wild", "perilous": 0 },
    "42_36": { "type": "wild", "perilous": 0 },
    "42_35": { "type": "wild", "perilous": 0 },
    "43_34": { "type": "wild", "perilous": 0 },
    "43_35": { "type": "wild", "perilous": 0 },
    "44_34": { "type": "wild", "perilous": 0 },
    "44_33": { "type": "wild", "perilous": 0 },
    "45_32": { "type": "wild", "perilous": 0 },
    "44_32": { "type": "wild", "perilous": 0 },
    "43_32": { "type": "wild", "perilous": 0 },
    "42_32": { "type": "wild", "perilous": 0 },
    "41_32": { "type": "wild", "perilous": 0 },
    "40_32": { "type": "wild", "perilous": 0 },
    "39_32": { "type": "wild", "perilous": 0 },
    "38_32": { "type": "wild", "perilous": 0 },
    "37_32": { "type": "wild", "perilous": 0 },
    "36_32": { "type": "wild", "perilous": 0 },
    "35_32": { "type": "wild", "perilous": 0 },
    "34_32": { "type": "wild", "perilous": 0 },
    "33_32": { "type": "wild", "perilous": 0 },
    "32_32": { "type": "wild", "perilous": 0 },
    "31_32": { "type": "wild", "perilous": 0 },
    "32_33": { "type": "wild", "perilous": 0 },
    "33_33": { "type": "wild", "perilous": 0 },
    "34_33": { "type": "wild", "perilous": 0 },
    "35_33": { "type": "wild", "perilous": 0 },
    "36_33": { "type": "wild", "perilous": 0 },
    "37_33": { "type": "wild", "perilous": 0 },
    "38_33": { "type": "wild", "perilous": 0 },
    "39_33": { "type": "wild", "perilous": 0 },
    "40_33": { "type": "wild", "perilous": 0 },
    "41_33": { "type": "wild", "perilous": 0 },
    "42_33": { "type": "wild", "perilous": 0 },
    "43_33": { "type": "wild", "perilous": 0 },
    "37_34": { "type": "wild", "perilous": 0 },
    "38_34": { "type": "wild", "perilous": 0 },
    "39_34": { "type": "wild", "perilous": 0 },
    "40_34": { "type": "wild", "perilous": 0 },
    "41_34": { "type": "wild", "perilous": 0 },
    "42_34": { "type": "wild", "perilous": 0 },
    "37_35": { "type": "wild", "perilous": 0 },
    "38_35": { "type": "wild", "perilous": 0 },
    "39_35": { "type": "wild", "perilous": 0 },
    "40_35": { "type": "wild", "perilous": 0 },
    "38_36": { "type": "wild", "perilous": 0 },
    "39_36": { "type": "wild", "perilous": 0 },
    "40_36": { "type": "wild", "perilous": 0 },
    "11_3": { "type": "wild", "perilous": 0 },
    "10_3": { "type": "wild", "perilous": 0 },
    "11_4": { "type": "wild", "perilous": 0 },
    "12_4": { "type": "wild", "perilous": 0 },
    "15_2": { "type": "wild", "perilous": 0 },
  }
};

/// Painted Hex State: Map of key "col_row" -> { type: "border"|"wild"|"dark"|"impassable", perilous: 0..5 }
let hexState = {};

// Journey Path Waypoints & Gameplay Progress
let journeyPath = [];
let currentStepIndex = 0;
let journeyLogHistory = [];

// Pan & Zoom ViewBox state
let viewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
let isPanning = false;
let startPan = { x: 0, y: 0 };
let isMouseDownToPaint = false;

export function initJourneyMap(containerId, logId) {
	loadHexMapState();
	renderJourneyHeaderControls();
	renderMapSvg(containerId);
	renderJourneyControls();
}

/**
 * Load saved hex grid state from localStorage
 */
function loadHexMapState() {
	try {
		const raw = localStorage.getItem("dmtools/tlotrr/hexmap");
		if (raw) {
			const parsed = JSON.parse(raw);
			hexState = parsed.hexState || DEFAULT_HEXMAP_DATA.hexState;
			if (parsed.settings) {
				hexRadius = parsed.settings.hexRadius !== undefined ? parsed.settings.hexRadius : DEFAULT_HEXMAP_DATA.settings.hexRadius;
				offsetX = parsed.settings.offsetX !== undefined ? parsed.settings.offsetX : DEFAULT_HEXMAP_DATA.settings.offsetX;
				offsetY = parsed.settings.offsetY !== undefined ? parsed.settings.offsetY : DEFAULT_HEXMAP_DATA.settings.offsetY;
				gridOpacity = parsed.settings.gridOpacity !== undefined ? parsed.settings.gridOpacity : DEFAULT_HEXMAP_DATA.settings.gridOpacity;
			}
		} else {
			// Initialize with DEFAULT_HEXMAP_DATA
			hexState = JSON.parse(JSON.stringify(DEFAULT_HEXMAP_DATA.hexState));
			hexRadius = DEFAULT_HEXMAP_DATA.settings.hexRadius;
			offsetX = DEFAULT_HEXMAP_DATA.settings.offsetX;
			offsetY = DEFAULT_HEXMAP_DATA.settings.offsetY;
			gridOpacity = DEFAULT_HEXMAP_DATA.settings.gridOpacity;
			saveHexMapState();
		}
	} catch (e) {
		console.error("Failed to load hex map state:", e);
		hexState = JSON.parse(JSON.stringify(DEFAULT_HEXMAP_DATA.hexState));
	}
}

/**
 * Save hex map state to localStorage
 */
function saveHexMapState() {
	try {
		localStorage.setItem("dmtools/tlotrr/hexmap", JSON.stringify({
			hexState,
			settings: { hexRadius, offsetX, offsetY, gridOpacity }
		}));
	} catch (e) {
		console.error("Failed to save hex map state:", e);
	}
}

/**
 * Render Header Controls (Edit Mode Toggle, Tool Selectors, Sliders)
 */
export function renderJourneyHeaderControls() {
	const ctrlEl = document.getElementById("mapHeaderToolbar");
	if (!ctrlEl) return;

	ctrlEl.innerHTML = `
		<div class="map-toolbar">
			<button class="btn-lm ${isEditMode ? 'danger' : 'primary'} btn-sm" onclick="window.toggleEditMode()">
				${isEditMode ? '🔒 Exit Hex Editor' : '🎨 Edit Hex Map Mode'}
			</button>

			${isEditMode ? `
				<div style="display:flex; gap:0.3rem; align-items:center; flex-wrap:wrap;">
					<span style="font-size:0.75rem; font-family:var(--font-title); color:var(--text-muted)">Paint:</span>
					<button class="tool-btn btn-border ${activePaintTool === 'border' ? 'active' : ''}" onclick="window.setPaintTool('border')">🌿 Border</button>
					<button class="tool-btn btn-wild ${activePaintTool === 'wild' ? 'active' : ''}" onclick="window.setPaintTool('wild')">🌾 Wild</button>
					<button class="tool-btn btn-dark ${activePaintTool === 'dark' ? 'active' : ''}" onclick="window.setPaintTool('dark')">🌋 Dark</button>
					<button class="tool-btn btn-impassable ${activePaintTool === 'impassable' ? 'active' : ''}" onclick="window.setPaintTool('impassable')">⬛ Impassable</button>
					<button class="tool-btn btn-perilous ${activePaintTool === 'perilous' ? 'active' : ''}" onclick="window.setPaintTool('perilous')">
						💀 Perilous (
						<select class="form-control" style="padding:0; height:18px; font-size:0.75rem;" onclick="event.stopPropagation()" onchange="window.setPerilRating(this.value)">
							${[1,2,3,4,5].map(n => `<option value="${n}" ${n === perilousRating ? 'selected' : ''}>${n}</option>`).join("")}
						</select>
						)
					</button>
					<button class="tool-btn ${activePaintTool === 'clear' ? 'active' : ''}" onclick="window.setPaintTool('clear')">🧹 Clear</button>
				</div>

				<div style="display:flex; gap:0.2rem; align-items:center; border-left:1px solid var(--border-light); padding-left:0.4rem;">
					<span style="font-size:0.75rem; color:var(--text-muted)">Brush:</span>
					<button class="tool-btn ${brushSize === 1 ? 'active' : ''}" onclick="window.setBrushSize(1)">1x</button>
					<button class="tool-btn ${brushSize === 2 ? 'active' : ''}" onclick="window.setBrushSize(2)">3x</button>
					<button class="tool-btn ${brushSize === 3 ? 'active' : ''}" onclick="window.setBrushSize(3)">7x</button>
				</div>

				<div style="display:flex; gap:0.6rem; align-items:center; border-left:1px solid var(--border-light); padding-left:0.6rem; font-size:0.75rem;">
					<label>Opacity (<span id="valGridOpacity" style="color:var(--text-gold); font-weight:bold">${Math.round(gridOpacity * 100)}</span>%):
						<input type="range" min="0.1" max="1" step="0.05" value="${gridOpacity}" oninput="window.updateGridSetting('gridOpacity', this.value)" style="width:65px;" />
					</label>
					<label>Radius (<span id="valHexRadius" style="color:var(--text-gold); font-weight:bold">${Number(hexRadius).toFixed(1)}</span>px):
						<input type="range" min="10" max="80" step="0.1" value="${hexRadius}" oninput="window.updateGridSetting('hexRadius', this.value)" style="width:75px;" />
					</label>
					<label>Offset X (<span id="valOffsetX" style="color:var(--text-gold); font-weight:bold">${Number(offsetX).toFixed(1)}</span>px):
						<input type="range" min="-100" max="100" step="0.5" value="${offsetX}" oninput="window.updateGridSetting('offsetX', this.value)" style="width:65px;" />
					</label>
					<label>Offset Y (<span id="valOffsetY" style="color:var(--text-gold); font-weight:bold">${Number(offsetY).toFixed(1)}</span>px):
						<input type="range" min="-100" max="100" step="0.5" value="${offsetY}" oninput="window.updateGridSetting('offsetY', this.value)" style="width:65px;" />
					</label>
					
					<button class="btn-lm btn-sm" onclick="window.exportHexMap()" title="Download Map Tile Styling & Terrain JSON">📥 Export Map</button>
					<button class="btn-lm btn-sm" onclick="window.triggerMapImport()" title="Import Saved Map JSON">📤 Import Map</button>
					<input type="file" id="mapFileInput" accept=".json" style="display:none" />
					<button class="btn-lm danger btn-sm" onclick="window.clearAllHexes()" title="Wipe all painted hexes">Clear All</button>
					<button class="btn-lm primary btn-sm" onclick="window.resetToDefaultMap()" title="Reset to default map state">↺ Reset Default</button>
				</div>
			` : `
				<div style="display:flex; gap:0.5rem; align-items:center; font-size:0.8rem; color:var(--text-muted)">
					<span>Mode: <strong>Journey Pathing</strong> (Click hexes to chart path)</span>
				</div>
			`}

			<div style="margin-left:auto; display:flex; gap:0.3rem;">
				<button class="btn-lm btn-sm" onclick="window.exportPlayerMapPng()" title="Export Player Map PNG (Dotted Route, Clean Hexes)">🖼️ Player Map PNG</button>
				<button class="btn-lm btn-sm" onclick="window.exportHexMap()" title="Export Map JSON">📥 Export</button>
				<button class="btn-lm btn-sm" onclick="window.triggerMapImport()" title="Import Map JSON">📤 Import</button>
				<button class="btn-lm btn-sm" onclick="window.mapZoom(0.8)">🔍 +</button>
				<button class="btn-lm btn-sm" onclick="window.mapZoom(1.25)">🔍 -</button>
				<button class="btn-lm btn-sm" onclick="window.resetMapView()">Reset View</button>
			</div>
		</div>
	`;
	setupMapImportHandler();
}

window.toggleEditMode = function() {
	isEditMode = !isEditMode;
	renderJourneyHeaderControls();
	renderMapSvg("mapContainer");
};

window.setPaintTool = function(tool) {
	activePaintTool = tool;
	renderJourneyHeaderControls();
};

window.setPerilRating = function(rating) {
	perilousRating = parseInt(rating, 10) || 1;
};

window.setBrushSize = function(size) {
	brushSize = parseInt(size, 10) || 1;
	renderJourneyHeaderControls();
};

window.updateGridSetting = function(key, val) {
	const num = parseFloat(val);
	if (key === 'hexRadius') {
		hexRadius = num;
		const el = document.getElementById("valHexRadius");
		if (el) el.textContent = num.toFixed(1);
	}
	if (key === 'offsetX') {
		offsetX = num;
		const el = document.getElementById("valOffsetX");
		if (el) el.textContent = num.toFixed(1);
	}
	if (key === 'offsetY') {
		offsetY = num;
		const el = document.getElementById("valOffsetY");
		if (el) el.textContent = num.toFixed(1);
	}
	if (key === 'gridOpacity') {
		gridOpacity = num;
		const el = document.getElementById("valGridOpacity");
		if (el) el.textContent = Math.round(num * 100);
	}
	saveHexMapState();
	renderMapSvg("mapContainer");
};

window.clearAllHexes = function() {
	if (confirm("Are you sure you want to clear ALL hex terrain paint data?")) {
		hexState = {};
		saveHexMapState();
		renderMapSvg("mapContainer");
		renderJourneyControls();
	}
};

window.resetMapView = function() {
	viewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
	const svg = document.getElementById("mapSvgElement");
	if (svg) svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
};

window.mapZoom = function(factor) {
	const svg = document.getElementById("mapSvgElement");
	if (!svg) return;

	let newW = viewBox.w * factor;
	let newH = viewBox.h * factor;

	const minW = MAP_WIDTH * 0.1;
	const maxW = MAP_WIDTH * 3.0;

	if (newW < minW) {
		newW = minW;
		newH = minW * (MAP_HEIGHT / MAP_WIDTH);
	} else if (newW > maxW) {
		newW = maxW;
		newH = maxW * (MAP_HEIGHT / MAP_WIDTH);
	}

	const cx = viewBox.x + viewBox.w / 2;
	const cy = viewBox.y + viewBox.h / 2;

	viewBox.x = cx - newW / 2;
	viewBox.y = cy - newH / 2;
	viewBox.w = newW;
	viewBox.h = newH;

	svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
};

/**
 * Generate 90° Rotated Hex Grid Center Points across map.png
 */
function getHexGridPoints() {
	const points = [];
	const r = hexRadius;
	const horizDist = Math.sqrt(3) * r;
	const vertDist = 1.5 * r;

	const cols = Math.ceil(MAP_WIDTH / horizDist) + 3;
	const rows = Math.ceil(MAP_HEIGHT / vertDist) + 3;

	for (let rIdx = 0; rIdx < rows; rIdx++) {
		const isOddRow = (rIdx % 2 !== 0);
		const rowOffsetX = isOddRow ? horizDist / 2 : 0;

		for (let cIdx = 0; cIdx < cols; cIdx++) {
			const cx = cIdx * horizDist + rowOffsetX + offsetX;
			const cy = rIdx * vertDist + offsetY;

			if (cx >= -r * 2 && cx <= MAP_WIDTH + r * 2 && cy >= -r * 2 && cy <= MAP_HEIGHT + r * 2) {
				points.push({
					key: `${cIdx}_${rIdx}`,
					col: cIdx,
					row: rIdx,
					cx,
					cy
				});
			}
		}
	}
	return points;
}

/**
 * Generate SVG Polygon Points for 90° Rotated (Pointy-Topped) Hex
 */
function getHexPolygonPoints(cx, cy, r) {
	const points = [];
	for (let i = 0; i < 6; i++) {
		const rad = ((i * 60 + 30) * Math.PI) / 180;
		const px = cx + r * Math.cos(rad);
		const py = cy + r * Math.sin(rad);
		points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
	}
	return points.join(" ");
}

/**
 * Main Map SVG Renderer
 */
function renderMapSvg(containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;

	const grid = getHexGridPoints();
	let hexesSvg = "";

	grid.forEach(h => {
		const points = getHexPolygonPoints(h.cx, h.cy, hexRadius - 1);
		const data = hexState[h.key] || {};
		const isPath = journeyPath.includes(h.key);

		let hexClass = "hex-cell";
		if (data.type) hexClass += ` hex-${data.type}`;
		if (data.perilous > 0) hexClass += ` hex-perilous`;
		if (isPath) hexClass += ` path-hex`;

		// Perilous Overlay badge
		let perilousSvg = "";
		if (data.perilous > 0) {
			const innerPoints = getHexPolygonPoints(h.cx, h.cy, hexRadius - 5);
			perilousSvg = `
				<polygon points="${innerPoints}" fill="none" stroke="#8b1e24" stroke-width="2" stroke-dasharray="3,2" style="pointer-events:none"/>
				<circle cx="${h.cx}" cy="${h.cy}" r="11" fill="#eedd99" stroke="#8b1e24" stroke-width="1.8" style="pointer-events:none"/>
				<text x="${h.cx}" y="${h.cy + 4}" fill="#681619" font-family="var(--font-title)" font-size="12" font-weight="bold" text-anchor="middle" style="pointer-events:none">${data.perilous}</text>
			`;
		}

		hexesSvg += `
			<g class="hex-group" onclick="window.onHexClick('${h.key}')">
				<polygon class="${hexClass}" data-key="${h.key}" points="${points}" opacity="${gridOpacity}" />
				${perilousSvg}
			</g>
		`;
	});

	// Render Journey Route Overlays (Solid Traveled Line, Dashed Remaining Line, Start 🚩, End 🏁, Fellowship Token 🧙‍♂️)
	let routeSvg = "";
	if (journeyPath.length > 0) {
		const pointsList = [];
		journeyPath.forEach(key => {
			const pt = grid.find(g => g.key === key);
			if (pt) pointsList.push(pt);
		});

		if (pointsList.length > 0) {
			// Clamp currentStepIndex
			if (currentStepIndex >= pointsList.length) currentStepIndex = Math.max(0, pointsList.length - 1);

			// Traveled points (0 to currentStepIndex)
			const traveledPts = pointsList.slice(0, currentStepIndex + 1).map(p => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
			// Remaining points (currentStepIndex to end)
			const remainingPts = pointsList.slice(currentStepIndex).map(p => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");

			routeSvg += `
				<!-- Traveled Path Line (Solid Gold Ink) -->
				${traveledPts.length > 0 ? `<polyline points="${traveledPts}" fill="none" stroke="#d4af37" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"/>` : ''}

				<!-- Remaining Path Line (Dashed Blue Ink) -->
				${remainingPts.length > 0 ? `<polyline points="${remainingPts}" fill="none" stroke="#409cff" stroke-width="3" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"/>` : ''}
			`;

			// Render Waypoint Markers & Fellowship Token
			pointsList.forEach((pt, idx) => {
				const isStart = (idx === 0);
				const isEnd = (idx === pointsList.length - 1 && pointsList.length > 1);
				const isCurrent = (idx === currentStepIndex);

				if (isStart) {
					// Departure / Start Location Marker (🚩 Flag Badge)
					routeSvg += `
						<g style="pointer-events:none">
							<circle cx="${pt.cx}" cy="${pt.cy}" r="14" fill="#2d6a3f" stroke="#eedd99" stroke-width="2"/>
							<text x="${pt.cx}" y="${pt.cy + 4}" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">🚩</text>
						</g>
					`;
				} else if (isEnd && !isCurrent) {
					// Destination Marker (🏁 End Badge)
					routeSvg += `
						<g style="pointer-events:none">
							<circle cx="${pt.cx}" cy="${pt.cy}" r="14" fill="#8b1e24" stroke="#eedd99" stroke-width="2"/>
							<text x="${pt.cx}" y="${pt.cy + 4}" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">🏁</text>
						</g>
					`;
				} else if (!isCurrent) {
					// Intermediate Waypoint Dot
					routeSvg += `
						<circle cx="${pt.cx}" cy="${pt.cy}" r="4" fill="#ffffff" stroke="#d4af37" stroke-width="1.5" style="pointer-events:none"/>
					`;
				}

				// Active Fellowship Position Token (🧙‍♂️ Ring Badge)
				if (isCurrent) {
					routeSvg += `
						<g class="fellowship-token" style="pointer-events:none">
							<circle cx="${pt.cx}" cy="${pt.cy}" r="17" fill="rgba(212, 175, 55, 0.95)" stroke="#ffffff" stroke-width="2.5"/>
							<circle cx="${pt.cx}" cy="${pt.cy}" r="22" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="4,3"/>
							<text x="${pt.cx}" y="${pt.cy + 5}" font-size="14" text-anchor="middle">🧙‍♂️</text>
						</g>
					`;
				}
			});
		}
	}

	container.innerHTML = `
		<svg class="map-svg" id="mapSvgElement" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}" preserveAspectRatio="xMidYMid meet">
			<!-- Background Map Image -->
			<image href="map.png" x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" style="pointer-events:none" />

			<!-- Hex Overlay Layer -->
			<g id="hexLayer">
				${hexesSvg}
			</g>

			<!-- Journey Route Layer -->
			<g id="routeLayer">
				${routeSvg}
			</g>
		</svg>
	`;

	setupMapPanEvents();
}

/**
 * Handle SVG Pan & Paint Drag Events
 */
function setupMapPanEvents() {
	const svg = document.getElementById("mapSvgElement");
	if (!svg) return;

	// Prevent context menu on right click so right-drag panning works cleanly
	svg.addEventListener("contextmenu", (e) => e.preventDefault());

	svg.addEventListener("mousedown", (e) => {
		// Right click (e.button === 2) in ANY mode OR Left click (e.button === 0) in Journey mode -> Start Panning
		if (e.button === 2 || (e.button === 0 && !isEditMode)) {
			isPanning = true;
			startPan = { x: e.clientX, y: e.clientY };
		} else if (e.button === 0 && isEditMode) {
			isMouseDownToPaint = true;
			lastPaintedKey = null;

			// Paint target under mouse immediately on mousedown
			const el = document.elementFromPoint(e.clientX, e.clientY);
			if (el) {
				const poly = el.closest ? el.closest("[data-key]") : (el.hasAttribute && el.hasAttribute("data-key") ? el : null);
				if (poly) {
					const key = poly.getAttribute("data-key");
					if (key) {
						lastPaintedKey = key;
						paintHex(key);
					}
				}
			}
		}
	});

	window.addEventListener("mouseup", () => {
		isPanning = false;
		isMouseDownToPaint = false;
		lastPaintedKey = null;
	});

	svg.addEventListener("mousemove", (e) => {
		if (isPanning) {
			const dx = (e.clientX - startPan.x) * (viewBox.w / svg.clientWidth);
			const dy = (e.clientY - startPan.y) * (viewBox.h / svg.clientHeight);
			viewBox.x -= dx;
			viewBox.y -= dy;
			startPan = { x: e.clientX, y: e.clientY };
			svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
		} else if (isMouseDownToPaint && isEditMode) {
			const el = document.elementFromPoint(e.clientX, e.clientY);
			if (el) {
				const poly = el.closest ? el.closest("[data-key]") : (el.hasAttribute && el.hasAttribute("data-key") ? el : null);
				if (poly) {
					const key = poly.getAttribute("data-key");
					if (key && key !== lastPaintedKey) {
						lastPaintedKey = key;
						paintHex(key);
					}
				}
			}
		}
	});

	// Smooth Mouse Wheel Focal Zoom
	svg.addEventListener("wheel", (e) => {
		e.preventDefault();

		const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
		const rect = svg.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Calculate SVG coordinate under mouse
		const svgMouseX = viewBox.x + (mouseX / rect.width) * viewBox.w;
		const svgMouseY = viewBox.y + (mouseY / rect.height) * viewBox.h;

		// Calculate new dimensions with min/max bounds
		let newW = viewBox.w * zoomFactor;
		let newH = viewBox.h * zoomFactor;

		const minW = MAP_WIDTH * 0.1;
		const maxW = MAP_WIDTH * 3.0;

		if (newW < minW) {
			newW = minW;
			newH = minW * (MAP_HEIGHT / MAP_WIDTH);
		} else if (newW > maxW) {
			newW = maxW;
			newH = maxW * (MAP_HEIGHT / MAP_WIDTH);
		}

		// Adjust viewBox x, y so zoom is focused on mouse cursor
		viewBox.x = svgMouseX - (mouseX / rect.width) * newW;
		viewBox.y = svgMouseY - (mouseY / rect.height) * newH;
		viewBox.w = newW;
		viewBox.h = newH;

		svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
	}, { passive: false });
}

/**
 * Neighbor Hex Calculations for Brush Size > 1
 */
function getDirectNeighbors(key) {
	const parts = key.split("_");
	const c = parseInt(parts[0], 10);
	const r = parseInt(parts[1], 10);
	const isOdd = (r % 2 !== 0);

	if (isOdd) {
		return [
			`${c + 1}_${r}`, `${c - 1}_${r}`,
			`${c}_${r - 1}`, `${c + 1}_${r - 1}`,
			`${c}_${r + 1}`, `${c + 1}_${r + 1}`
		];
	} else {
		return [
			`${c + 1}_${r}`, `${c - 1}_${r}`,
			`${c - 1}_${r - 1}`, `${c}_${r - 1}`,
			`${c - 1}_${r + 1}`, `${c}_${r + 1}`
		];
	}
}

function getClusterKeys(centerKey, size) {
	const set = new Set([centerKey]);
	if (size >= 2) {
		getDirectNeighbors(centerKey).forEach(k => set.add(k));
	}
	if (size >= 3) {
		const ring1 = Array.from(set);
		ring1.forEach(k => {
			getDirectNeighbors(k).forEach(n => set.add(n));
		});
	}
	return Array.from(set);
}

/**
 * Hex Interaction Handlers
 */
window.onHexClick = function(key) {
	if (isEditMode) {
		paintHex(key);
	} else {
		toggleJourneyWaypoint(key);
	}
};

window.onHexMouseEnter = function(key) {
	if (isEditMode && isMouseDownToPaint) {
		paintHex(key);
	}
};

function paintHex(centerKey) {
	const targets = getClusterKeys(centerKey, brushSize);
	targets.forEach(key => {
		if (!hexState[key]) hexState[key] = { type: null, perilous: 0 };

		if (activePaintTool === "clear") {
			delete hexState[key];
		} else if (activePaintTool === "perilous") {
			hexState[key].perilous = perilousRating;
		} else {
			hexState[key].type = activePaintTool;
		}
	});

	saveHexMapState();
	renderMapSvg("mapContainer");
	renderJourneyControls();
}

function toggleJourneyWaypoint(key) {
	const idx = journeyPath.indexOf(key);
	if (idx >= 0) {
		journeyPath.splice(idx, 1);
	} else {
		journeyPath.push(key);
	}
	renderMapSvg("mapContainer");
	renderJourneyControls();
}

/**
 * Journey Controls & Distance Calculator
 */
export function renderJourneyControls() {
	const ctrlEl = document.getElementById("journeyControls");
	if (!ctrlEl) return;

	if (journeyPath.length === 0) {
		ctrlEl.innerHTML = `
			<div style="padding: 1rem; color: var(--text-muted); font-size: 0.9rem; text-align: center;">
				Click hexes on the map to chart a <strong>Journey Path</strong>. Switch to <strong>Edit Hex Mode</strong> to paint terrain & perilous areas!
			</div>
		`;
		return;
	}

	// Calculate travel metrics and progress
	let totalHexes = journeyPath.length;
	let totalDays = 0;
	let traveledDays = 0;
	let perilousCount = 0;
	let highestPeril = 0;

	// Clamp step index
	if (currentStepIndex >= totalHexes) currentStepIndex = Math.max(0, totalHexes - 1);

	journeyPath.forEach((key, idx) => {
		const h = hexState[key] || {};
		let dayCost = 2; // Default ~2 days per hex

		if (h.type === "border") dayCost = 1;
		if (h.type === "wild") dayCost = 2;
		if (h.type === "dark") dayCost = 3;
		if (h.type === "impassable") dayCost = 5;

		totalDays += dayCost;
		if (idx <= currentStepIndex) traveledDays += dayCost;

		if (h.perilous > 0) {
			perilousCount++;
			if (h.perilous > highestPeril) highestPeril = h.perilous;
		}
	});

	ctrlEl.innerHTML = `
		<div style="display:flex; flex-direction:column; gap: 0.8rem;">
			<div style="display:flex; justify-content:space-between; align-items:center;">
				<div>
					<span class="badge badge-gold">JOURNEY ROUTE</span>
					<h3 style="color:var(--text-gold); margin-top:0.2rem;">${totalHexes} Hexes Charted</h3>
				</div>
				<div style="display:flex; gap:0.3rem;">
					<button class="btn-lm btn-sm" onclick="window.exportPlayerMapPng()" title="Export clean Player Map PNG with dotted route line">🖼️ Player Map PNG</button>
					<button class="btn-lm danger btn-sm" onclick="window.clearJourneyPath()">Reset Path</button>
				</div>
			</div>

			<!-- Fellowship Progress Tracker Controls -->
			<div style="padding:0.75rem; background:rgba(0,0,0,0.35); border:1px solid var(--border-gold); border-radius:4px;">
				<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
					<span style="font-size:0.8rem; font-family:var(--font-title); color:var(--text-gold)">🧙‍♂️ Fellowship Location:</span>
					<span style="font-size:0.8rem; color:var(--text-primary); font-weight:bold;">
						Hex ${currentStepIndex + 1} of ${totalHexes} (~${traveledDays} / ${totalDays} Days)
					</span>
				</div>

				<div style="display:flex; gap:0.5rem; align-items:center;">
					<button class="btn-lm btn-sm" onclick="window.stepJourneyPath(-1)" ${currentStepIndex === 0 ? 'disabled' : ''}>◀ Prev</button>
					<input type="range" min="0" max="${totalHexes - 1}" step="1" value="${currentStepIndex}" oninput="window.setJourneyStep(this.value)" style="flex:1;" />
					<button class="btn-lm btn-sm" onclick="window.stepJourneyPath(1)" ${currentStepIndex >= totalHexes - 1 ? 'disabled' : ''}>Next ▶</button>
				</div>
			</div>

			<div class="grid-3" style="margin-top:0.1rem;">
				<div class="resource-box">
					<div style="font-size:0.7rem; font-family:var(--font-title); color:var(--text-muted)">TOTAL DISTANCE</div>
					<div style="font-size:1.1rem; font-family:var(--font-title); color:var(--text-gold); font-weight:bold;">${totalHexes} Hexes</div>
				</div>
				<div class="resource-box">
					<div style="font-size:0.7rem; font-family:var(--font-title); color:var(--text-muted)">EST. DURATION</div>
					<div style="font-size:1.1rem; font-family:var(--font-title); color:var(--text-heading); font-weight:bold;">~${totalDays} Days</div>
				</div>
				<div class="resource-box ${perilousCount > 0 ? 'shadow-box' : ''}">
					<div style="font-size:0.7rem; font-family:var(--font-title); color:${perilousCount > 0 ? 'var(--text-danger)' : 'var(--text-muted)'}">PERIL LEVEL</div>
					<div style="font-size:1.0rem; font-family:var(--font-title); color:${perilousCount > 0 ? 'var(--text-danger)' : 'var(--text-success)'}; font-weight:bold;">
						${perilousCount > 0 ? `Rating ${highestPeril} (${perilousCount} Hexes)` : 'Safe'}
					</div>
				</div>
			</div>

			<div style="display:flex; gap:0.5rem; margin-top:0.3rem;">
				<button class="btn-lm primary" style="flex:1" onclick="window.rollJourneyEvent()">
					🎲 Roll Journey Event (1d12)
				</button>
			</div>
		</div>
	`;
}

window.clearJourneyPath = function() {
	journeyPath = [];
	currentStepIndex = 0;
	renderMapSvg("mapContainer");
	renderJourneyControls();
};

window.stepJourneyPath = function(dir) {
	if (journeyPath.length === 0) return;
	currentStepIndex = Math.max(0, Math.min(journeyPath.length - 1, currentStepIndex + dir));
	renderMapSvg("mapContainer");
	renderJourneyControls();
};

window.setJourneyStep = function(val) {
	if (journeyPath.length === 0) return;
	currentStepIndex = Math.max(0, Math.min(journeyPath.length - 1, parseInt(val, 10) || 0));
	renderMapSvg("mapContainer");
	renderJourneyControls();
};

window.exportPlayerMapPng = function() {
	if (!journeyPath || journeyPath.length === 0) {
		alert("Please chart a journey path on the map first!");
		return;
	}

	const grid = getHexGridPoints();
	const pointsList = [];
	journeyPath.forEach(key => {
		const pt = grid.find(g => g.key === key);
		if (pt) pointsList.push(pt);
	});

	if (pointsList.length === 0) return;

	// Calculate Bounding Box of Route with margin padding
	const xs = pointsList.map(p => p.cx);
	const ys = pointsList.map(p => p.cy);

	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);

	// Add generous margin around the route
	const padX = hexRadius * 8;
	const padY = hexRadius * 8;

	const cropX = Math.max(0, Math.floor(minX - padX));
	const cropY = Math.max(0, Math.floor(minY - padY));
	const cropW = Math.min(MAP_WIDTH - cropX, Math.ceil((maxX + padX) - cropX));
	const cropH = Math.min(MAP_HEIGHT - cropY, Math.ceil((maxY + padY) - cropY));

	// Load background map image
	const mapImg = new Image();
	mapImg.crossOrigin = "anonymous";
	mapImg.onload = function() {
		const canvas = document.createElement("canvas");
		canvas.width = cropW;
		canvas.height = cropH;
		const ctx = canvas.getContext("2d");

		// 1. Draw Cropped Background Map Image
		ctx.drawImage(mapImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

		// 2. Draw Clean Hex Grid Outlines (Uncolored parchment style)
		const visibleHexes = grid.filter(h => 
			h.cx >= cropX - hexRadius * 2 && h.cx <= cropX + cropW + hexRadius * 2 &&
			h.cy >= cropY - hexRadius * 2 && h.cy <= cropY + cropH + hexRadius * 2
		);

		ctx.strokeStyle = "rgba(100, 75, 30, 0.4)";
		ctx.lineWidth = 1;

		visibleHexes.forEach(h => {
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const rad = ((i * 60 + 30) * Math.PI) / 180;
				const px = (h.cx + hexRadius * Math.cos(rad)) - cropX;
				const py = (h.cy + hexRadius * Math.sin(rad)) - cropY;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.stroke();
		});

		// 3. Draw Dotted Journey Route Line
		if (pointsList.length > 1) {
			ctx.save();
			ctx.setLineDash([10, 6]);
			ctx.strokeStyle = "#8b1e24"; // Rich Tolkien Red Ink
			ctx.lineWidth = 4.5;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			ctx.beginPath();
			pointsList.forEach((pt, i) => {
				const px = pt.cx - cropX;
				const py = pt.cy - cropY;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			});
			ctx.stroke();
			ctx.restore();
		}

		// 4. Draw Waypoint Badges (Start 🚩 & Destination 🏁)
		pointsList.forEach((pt, idx) => {
			const px = pt.cx - cropX;
			const py = pt.cy - cropY;
			const isStart = (idx === 0);
			const isEnd = (idx === pointsList.length - 1 && pointsList.length > 1);

			if (isStart) {
				// Departure / Start Location Badge
				ctx.beginPath();
				ctx.arc(px, py, 14, 0, Math.PI * 2);
				ctx.fillStyle = "#2d6a3f";
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = "#eedd99";
				ctx.stroke();

				ctx.fillStyle = "#ffffff";
				ctx.font = "bold 12px serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("🚩", px, py);
			} else if (isEnd) {
				// Destination Badge
				ctx.beginPath();
				ctx.arc(px, py, 14, 0, Math.PI * 2);
				ctx.fillStyle = "#8b1e24";
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = "#eedd99";
				ctx.stroke();

				ctx.fillStyle = "#ffffff";
				ctx.font = "bold 12px serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("🏁", px, py);
			} else {
				// Intermediate Waypoint Dot
				ctx.beginPath();
				ctx.arc(px, py, 4, 0, Math.PI * 2);
				ctx.fillStyle = "#ffffff";
				ctx.fill();
				ctx.lineWidth = 1.5;
				ctx.strokeStyle = "#8b1e24";
				ctx.stroke();
			}
		});

		// 5. Trigger PNG Download
		const dataUrl = canvas.toDataURL("image/png");
		const a = document.createElement("a");
		a.href = dataUrl;
		a.download = `player-journey-map-${new Date().toISOString().slice(0, 10)}.png`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};
	mapImg.src = "map.png";
};

window.rollJourneyEvent = function() {
	const roll = Math.floor(Math.random() * 12) + 1;
	const eventObj = JOURNEY_EVENTS.find(e => e.roll === roll) || JOURNEY_EVENTS[0];

	// Check if path has perilous hexes
	let perilWarning = "";
	let highestPeril = 0;
	journeyPath.forEach(key => {
		const h = hexState[key] || {};
		if (h.perilous > highestPeril) highestPeril = h.perilous;
	});

	if (highestPeril > 0) {
		perilWarning = `<div style="font-size:0.8rem; color:var(--text-danger); margin-top:0.2rem"><strong>⚠️ Perilous Area Warning (Rating ${highestPeril}):</strong> Check DC is increased by +${highestPeril}!</div>`;
	}

	// Find if someone in party has target role
	const party = getParty();
	const roleHolder = party.find(p => p.travelRole && p.travelRole.toLowerCase() === eventObj.targetRole.toLowerCase());
	const roleText = roleHolder ? `Assigned to ${roleHolder.name} (${eventObj.targetRole})` : `No ${eventObj.targetRole} assigned to company!`;

	// Check if spies / dark presence triggered
	if (roll === 4 || roll === 8) {
		addEyeAwareness(2);
	}

	const logText = `
		<div class="event-entry">
			<div class="time">${new Date().toLocaleTimeString()} · Event Roll #${roll}</div>
			<div style="font-weight:bold; color:var(--text-gold); font-family:var(--font-title); font-size:1rem;">${eventObj.title}</div>
			<div style="font-size:0.85rem; color:var(--text-muted); margin:0.2rem 0;">${eventObj.desc}</div>
			<div style="font-size:0.8rem;"><strong>Check:</strong> DC ${eventObj.dc + highestPeril} ${eventObj.skill} (${roleText})</div>
			${perilWarning}
			<div style="font-size:0.8rem; color:var(--text-success); margin-top:0.2rem;"><strong>Success:</strong> ${eventObj.success}</div>
			<div style="font-size:0.8rem; color:var(--text-danger)"><strong>Failure:</strong> ${eventObj.failure}</div>
		</div>
	`;

	journeyLogHistory.unshift(logText);
	renderJourneyLog();
};

function renderJourneyLog() {
	const logEl = document.getElementById("journeyLog");
	if (!logEl) return;

	if (journeyLogHistory.length === 0) {
		logEl.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">No journey events recorded yet. Chart a journey path and roll events above!</div>`;
		return;
	}

	logEl.innerHTML = journeyLogHistory.join("");
}

window.toggleHudCollapse = function() {
	const panel = document.getElementById("mapHudPanel");
	if (panel) panel.classList.toggle("collapsed");
};

window.exportHexMap = function() {
	const mapData = {
		fileType: "5etools-lotr-hexmap",
		version: 1,
		exportedAt: new Date().toISOString(),
		settings: {
			hexRadius,
			offsetX,
			offsetY,
			gridOpacity
		},
		hexState
	};

	const jsonStr = JSON.stringify(mapData, null, 2);
	const blob = new Blob([jsonStr], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `lotr-hexmap-data-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

window.triggerMapImport = function() {
	const fileInput = document.getElementById("mapFileInput");
	if (fileInput) fileInput.click();
};

export function setupMapImportHandler() {
	const fileInput = document.getElementById("mapFileInput");
	if (!fileInput || fileInput.dataset.bound === "true") return;
	fileInput.dataset.bound = "true";

	fileInput.addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const data = JSON.parse(evt.target.result);
				if (data.hexState) {
					hexState = data.hexState;
				}
				if (data.settings) {
					if (data.settings.hexRadius !== undefined) hexRadius = data.settings.hexRadius;
					if (data.settings.offsetX !== undefined) offsetX = data.settings.offsetX;
					if (data.settings.offsetY !== undefined) offsetY = data.settings.offsetY;
					if (data.settings.gridOpacity !== undefined) gridOpacity = data.settings.gridOpacity;
				}
				saveHexMapState();
				renderJourneyHeaderControls();
				renderMapSvg("mapContainer");
				renderJourneyControls();
				alert("Map tile styling and terrain data imported successfully!");
			} catch (err) {
				alert("Error importing map file: " + err.message);
			}
		};
		reader.readAsText(file);
	});
}

window.resetToDefaultMap = function() {
	if (confirm("Reset hex map terrain and grid alignment to default state?")) {
		hexState = JSON.parse(JSON.stringify(DEFAULT_HEXMAP_DATA.hexState));
		hexRadius = DEFAULT_HEXMAP_DATA.settings.hexRadius;
		offsetX = DEFAULT_HEXMAP_DATA.settings.offsetX;
		offsetY = DEFAULT_HEXMAP_DATA.settings.offsetY;
		gridOpacity = DEFAULT_HEXMAP_DATA.settings.gridOpacity;
		saveHexMapState();
		renderJourneyHeaderControls();
		renderMapSvg("mapContainer");
		renderJourneyControls();
	}
};
