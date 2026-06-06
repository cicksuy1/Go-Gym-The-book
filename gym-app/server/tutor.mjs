// Tutor bridge — owner: tutor-host agent (see CONTRACT.md).
// Hosts the background Claude conversation (Agent SDK) and the SSE event stream.
// GET /events (SSE) · POST /input
import { Router } from 'express';

export const tutorRouter = Router();

/**
 * Broadcast an SSE event to all connected clients.
 * Other server modules call this (e.g. routes.mjs after a test run).
 * @param {string} _event
 * @param {object} _data
 */
export function broadcast(_event, _data) {
  // implemented by tutor-host agent
}

/**
 * Send a turn into the background tutor conversation and resolve with the
 * parsed JSON envelope ({type: 'say'|'grade'|'hint', ...}).
 * @param {string} _text
 * @returns {Promise<object>}
 */
export async function askTutor(_text) {
  throw new Error('tutor not yet implemented');
}
