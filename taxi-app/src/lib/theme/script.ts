import { DEFAULT_MODE, DEFAULT_THEME } from "./themes";

export const THEME_STORAGE_KEY = "tp-theme-v3";

/** Inline-Skript für <head>: setzt Theme vor dem ersten Rendern (kein Aufblitzen). */
export const THEME_HEAD_SCRIPT = `(function(){var d=document.documentElement,t="${DEFAULT_THEME}",m="${DEFAULT_MODE}";try{var s=JSON.parse(localStorage.getItem("${THEME_STORAGE_KEY}")||"null");if(s){if(/^(weiss|donau|prater|gold|neon)$/.test(s.theme))t=s.theme;if(/^(light|dark|system)$/.test(s.mode))m=s.mode;}else{var o=localStorage.getItem("tp-theme");if(o==="dark")m="dark";}}catch(e){}d.setAttribute("data-theme",t);var k=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.classList.toggle("dark",k);try{if(localStorage.getItem("tp-reduce-motion")==="on")d.classList.add("reduce-motion");}catch(e){}})();`;
