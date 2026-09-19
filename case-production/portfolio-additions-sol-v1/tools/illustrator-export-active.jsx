#target illustrator

var document = app.activeDocument;
var root = "/Users/chim/Codex开发项目/案例展示网站/case-production/illustrator-clean-v1";
var name = document.name;
var key = "illustrator-document";
if (/圣诞-线上/.test(name)) key = "tatan-christmas-online";
else if (/新年-线上/.test(name)) key = "tatan-newyear-online";
else if (/桃花-包装立牌/.test(name)) key = "springlai-peach-standee";
else if (/桂花-包装立牌/.test(name)) key = "springlai-osmanthus-standee";
else if (/桂花-杯套/.test(name)) key = "springlai-osmanthus-cupsleeve";

function ensureFolder(folder) {
  if (folder.exists) return true;
  if (folder.parent && !folder.parent.exists) ensureFolder(folder.parent);
  return folder.create();
}

function escapeJson(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

function toJson(value, depth) {
  var indent = "", childIndent = "", index;
  for (index = 0; index < depth; index += 1) indent += "  ";
  childIndent = indent + "  ";
  if (value === null) return "null";
  if (typeof value === "string") return "\"" + escapeJson(value) + "\"";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Array) {
    var arrayParts = [];
    for (index = 0; index < value.length; index += 1) arrayParts.push(childIndent + toJson(value[index], depth + 1));
    return arrayParts.length ? "[\n" + arrayParts.join(",\n") + "\n" + indent + "]" : "[]";
  }
  var objectParts = [];
  for (var property in value) if (value.hasOwnProperty(property)) objectParts.push(childIndent + "\"" + escapeJson(property) + "\": " + toJson(value[property], depth + 1));
  return objectParts.length ? "{\n" + objectParts.join(",\n") + "\n" + indent + "}" : "{}";
}

function isProductionLayer(layerName) {
  return /(标注信息|包装线|刀线|模切|尺寸|标注|出血|裁切|印刷|辅助线|参考线|dieline|die[ -]?cut|cut[ -]?line|trim|bleed|dimension|measure|note)/i.test(layerName);
}

function inspectAndHide(layers, prefix, hidden, records) {
  for (var index = 0; index < layers.length; index += 1) {
    var layer = layers[index];
    var fullName = prefix ? prefix + " / " + layer.name : layer.name;
    var record = { name: fullName, visibleBefore: layer.visible, locked: layer.locked };
    if (layer.visible && isProductionLayer(fullName)) {
      layer.visible = false;
      hidden.push(layer);
      record.hiddenForCleanExport = true;
    }
    records.push(record);
    if (layer.layers && layer.layers.length) inspectAndHide(layer.layers, fullName, hidden, records);
  }
}

var outFolder = Folder(root + "/exports/" + key);
ensureFolder(outFolder);
var hidden = [], layers = [], outputs = [], artboards = [];
inspectAndHide(document.layers, "", hidden, layers);
for (var artboardIndex = 0; artboardIndex < document.artboards.length; artboardIndex += 1) {
  document.artboards.setActiveArtboardIndex(artboardIndex);
  var artboard = document.artboards[artboardIndex];
  var rect = artboard.artboardRect;
  var output = File(outFolder.fsName + "/artboard-" + (artboardIndex + 1) + ".jpg");
  var options = new ExportOptionsJPEG();
  options.antiAliasing = true;
  options.artBoardClipping = true;
  options.horizontalScale = 100;
  options.verticalScale = 100;
  options.qualitySetting = 100;
  options.optimization = true;
  document.exportFile(output, ExportType.JPEG, options);
  outputs.push(output.fsName);
  artboards.push({ index: artboardIndex + 1, name: artboard.name, widthPoints: rect[2] - rect[0], heightPoints: rect[1] - rect[3] });
}

var report = File(root + "/" + key + "-report.json");
report.encoding = "UTF-8";
report.open("w");
report.write(toJson({ application: app.name, version: app.version, generatedAt: new Date().toString(), key: key, source: document.fullName.fsName, sourceFilesOverwritten: 0, artboards: artboards, layers: layers, hiddenProductionLayerCount: hidden.length, outputs: outputs }, 0));
report.close();
document.close(SaveOptions.DONOTSAVECHANGES);
alert("AI 纯净导出完成：" + key + " · " + outputs.length + " 个画板");
