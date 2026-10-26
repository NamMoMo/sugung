import { chests, selectedOptions } from './journey.js';
import { encodeResult } from './result-link.js';
import { earnedLights } from './seal-transfer.js';

function selectionsFor(answers) {
  return chests.flatMap(chest => selectedOptions(chest, answers).map(option => ({
    chest_id: chest.id, scene_id: chest.scenes[option.sceneIndex].id,
    option_id: option.id, label: option.label, action: option.action,
    treasure: { name: option.treasure.name, description: option.treasure.description },
  })));
}
export function createTreasureRecorder(now = Date.now) {
  let started = null, finished = null, history = [];
  return {
    start() { started ??= now(); },
    reset() { started = finished = null; history = []; },
    choose(chestId, index, optionId) {
      const chest = chests.find(item => item.id === chestId), scene = chest?.scenes[index];
      if (!scene?.options.some(option => option[0] === optionId)) return false;
      started ??= now();
      const at = Math.max(started, history.length ? Date.parse(history.at(-1).at) : started, now());
      history.push({ sequence: history.length + 1, chest_id: chestId, scene_id: scene.id,
        option_id: optionId, at: new Date(at).toISOString(), elapsed_ms: at - started });
      return true;
    },
    snapshot(answers, placements, language = 'ko') {
      const code = encodeResult(answers), lights = earnedLights(answers);
      if (started === null || lights.length !== 6 || history.length < 6 ||
          Object.keys(placements).length !== 6 || new Set(Object.values(placements)).size !== 6 ||
          !lights.every(light => Number.isInteger(placements[light.id]) && placements[light.id] >= 0 && placements[light.id] < 6))
        throw new Error('INCOMPLETE_TREASURE_RESULT');
      finished ??= now();
      const selections = selectionsFor(answers);
      return {
        schema_version: 1, room_id: 'self-knowledge', team_id: 2, revision: history.length,
        started_at: new Date(started).toISOString(), finished_at: new Date(finished).toISOString(),
        updated_at: new Date(now()).toISOString(), duration_ms: Math.max(0, finished - started),
        language: language === 'en' ? 'en' : 'ko', answers: structuredClone(answers), result_code: code,
        selections, selected_actions: selections.map(option => option.action),
        summary: { keywords: selections.map(option => option.label), treasures: selections.map(option => option.treasure.name) },
        seals_count: 6, seal_placements: { ...placements }, history: structuredClone(history),
      };
    },
  };
}

export function validateTreasureResult(result) {
  try {
    if (result?.schema_version !== 1 || result.room_id !== 'self-knowledge' || result.team_id !== 2 ||
        !Number.isInteger(result.revision) || result.revision < 6 || result.revision > 10000 ||
        !Array.isArray(result.history) || result.history.length !== result.revision || result.seals_count !== 6 ||
        !['ko', 'en'].includes(result.language) || Object.keys(result.answers || {}).length !== 3 ||
        !chests.every(chest => Array.isArray(result.answers[chest.id]) && result.answers[chest.id].length === 2)) return false;
    const selections = selectionsFor(result.answers), lights = earnedLights(result.answers);
    if (encodeResult(result.answers) !== result.result_code || selections.length !== 6 || lights.length !== 6 ||
        JSON.stringify(selections) !== JSON.stringify(result.selections) ||
        JSON.stringify(selections.map(option => option.action)) !== JSON.stringify(result.selected_actions) ||
        JSON.stringify({ keywords: selections.map(option => option.label), treasures: selections.map(option => option.treasure.name) }) !== JSON.stringify(result.summary)) return false;
    const placements = result.seal_placements;
    if (!placements || Object.keys(placements).length !== 6 || new Set(Object.values(placements)).size !== 6 ||
        !lights.every(light => Number.isInteger(placements[light.id]) && placements[light.id] >= 0 && placements[light.id] < 6)) return false;
    const start = Date.parse(result.started_at), finish = Date.parse(result.finished_at), update = Date.parse(result.updated_at);
    if (![start, finish, update].every(Number.isFinite) || start > finish || finish > update || result.duration_ms !== finish - start) return false;
    const latest = new Map(); let previous = start;
    for (const [index, event] of result.history.entries()) {
      const scene = chests.find(chest => chest.id === event.chest_id)?.scenes.find(scene => scene.id === event.scene_id);
      const at = Date.parse(event.at);
      if (!scene?.options.some(option => option[0] === event.option_id) || event.sequence !== index + 1 ||
          !Number.isFinite(at) || at < previous || at > update || event.elapsed_ms !== at - start) return false;
      previous = at; latest.set(event.scene_id, event.option_id);
    }
    return selections.every(option => latest.get(option.scene_id) === option.option_id);
  } catch { return false; }
}
