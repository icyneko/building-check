import type { State } from './workspace';
export function buildingLogs(state: State) {
  return state.buildings.map(building => {
    const rooms = state.rooms.filter(room => room.buildingId === building.id).map(room => {
      const history = room.checkIns.map(checkIn => ({ ...checkIn, roomId: room.id, roomName: room.name }))
        .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
      return { room, latest: history[0], history };
    });
    const history = rooms.flatMap(room => room.history).sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
    return { building, rooms, history, latest: history[0] };
  });
}
