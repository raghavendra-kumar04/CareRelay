let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

function emitToFamily(familyId, event, payload) {
  if (!io) return;
  io.to(`family:${String(familyId)}`).emit(event, payload);
}

module.exports = { setIO, getIO, emitToFamily };
