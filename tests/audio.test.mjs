import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../src/audio.js';
globalThis.Audio=class {constructor(src){this.src=src;this.listeners={};}addEventListener(type,listener){this.listeners[type]=listener;}play(){return Promise.resolve();}pause(){}};
test('gameplay starts with a different track from the old first-level theme',()=>{const s=new Sound();s.setScene(0);assert.equal(s.track.src,'Sounds/lvl1_theme.mp3');assert.equal(s.track.loop,false);});
test('the playlist advances at the end of a track and visits all four tracks',()=>{const s=new Sound();s.setScene(0);const tracks=new Set([s.track.src]);for(let i=0;i<3;i++){s.track.listeners.ended();tracks.add(s.track.src);}assert.equal(tracks.size,4);});
test('shuffled cycles never repeat a track consecutively',()=>{const s=new Sound();s.setScene(0);let previous=s.track.src;for(let i=0;i<40;i++){s.nextTrack();assert.notEqual(s.track.src,previous);previous=s.track.src;}});
test('level changes advance the playlist and menu restores its own music',()=>{const s=new Sound();s.setScene(0);const first=s.track.src;s.setScene(1);assert.notEqual(s.track.src,first);s.setScene(-1);assert.equal(s.track.src,'Sounds/main_menu_theme.mp3');assert.equal(s.track.loop,true);s.nextTrack();assert.equal(s.track.src,'Sounds/main_menu_theme.mp3');});
