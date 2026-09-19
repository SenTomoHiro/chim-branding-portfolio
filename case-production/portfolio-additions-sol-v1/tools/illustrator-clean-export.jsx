#target illustrator

app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

var repo = "/Users/chim/Codex开发项目/案例展示网站";
var root = repo + "/case-production/illustrator-clean-v1";
var reportFile = File(root + "/illustrator-export-report.json");
var sources = [
  { key: "tatan-christmas-online", path: "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-圣诞-线上.ai" },
  { key: "tatan-newyear-online", path: "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-新年-线上.ai" },
  { key: "tatan-christmas-print", path: "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-圣诞-印刷.ai" },
  { key: "tatan-christmas-print-extra", path: "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-圣诞-印刷后加.ai" },
  { key: "tatan-newyear-print", path: "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-新年-印刷.ai" },
  { key: "tatan-newyear-print-extra", path: "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-新年-印刷后加.ai" },
  { key: "springlai-peach-standee", path: "/Users/chim/Downloads/春莱/定稿文件/202312/2312-艺人桃花+桂花/231212-艺人-桃花-包装立牌.ai" },
  { key: "springlai-osmanthus-standee", path: "/Users/chim/Downloads/春莱/定稿文件/202312/2312-艺人桃花+桂花/231212-艺人-桂花-包装立牌.ai" },
  { key: "springlai-osmanthus-cupsleeve", path: "/Users/chim/Downloads/春莱/定稿文件/202312/2312-艺人桃花+桂花/231212-艺人-桂花-杯套-改3.ai" }
];

function ensureFolder(folder) {
  if (folder.exists) return true;
  if (folder.parent && !folder.parent.exists) ensureFolder(folder.parent);
  return folder.create();
}

function escapeJson(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

function toJson(value, depth) {
  var indent = "";
  var childIndent = "";
  var index;
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
  for (var key in value) if (value.hasOwnProperty(key)) objectParts.push(childIndent + "\"" + escapeJson(key) + "\": " + toJson(value[key], depth + 1));
  return objectParts.length ? "{\n" + objectParts.join(",\n") + "\n" + indent + "}" : "{}";
}

function productionLayer(name) {
  return /(包装线|刀线|模切|尺寸|标注|出血|裁切|印刷|辅助线|参考线|dieline|die[ -]?cut|cut[ -]?line|trim|bleed|dimension|measure|note)/i.test(name);
}

function inspectLayers(layers, prefix, hidden) {
  var result = [];
  for (var index = 0; index < layers.length; index += 1) {
    var layer = layers[index];
    var fullName = prefix ? prefix + " / " + layer.name : layer.name;
    var item = { name: fullName, visible: layer.visible, locked: layer.locked, printable: layer.printable };
    if (layer.visible && productionLayer(fullName)) {
      try {
        layer.visible = false;
        hidden.push(fullName);
        item.hiddenForCleanExport = true;
      } catch (error) {
        item.hideError = String(error);
      }
    }
    result.push(item);
    if (layer.layers && layer.layers.length) result = result.concat(inspectLayers(layer.layers, fullName, hidden));
  }
  return result;
}

ensureFolder(Folder(root));
var documents = [];
for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
  var source = sources[sourceIndex];
  var document = null;
  try {
    var sourceFile = File(source.path);
    var outFolder = Folder(root + "/exports/" + source.key);
    ensureFolder(outFolder);
    document = app.open(sourceFile);
    var hiddenLayers = [];
    var layers = inspectLayers(document.layers, "", hiddenLayers);
    var artboards = [];
    var outputs = [];
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
      artboards.push({ index: artboardIndex + 1, name: artboard.name, widthPoints: rect[2] - rect[0], heightPoints: rect[1] - rect[3] });
      outputs.push(output.fsName);
    }
    documents.push({ key: source.key, source: source.path, status: "success", artboardCount: document.artboards.length, artboards: artboards, layerCount: layers.length, layers: layers, hiddenProductionLayers: hiddenLayers, outputs: outputs });
  } catch (error) {
    documents.push({ key: source.key, source: source.path, status: "skipped", reason: String(error) });
  } finally {
    if (document) document.close(SaveOptions.DONOTSAVECHANGES);
  }
}

reportFile.encoding = "UTF-8";
reportFile.open("w");
reportFile.write(toJson({ application: app.name, version: app.version, generatedAt: new Date().toString(), sourceFilesOverwritten: 0, documents: documents }, 0));
reportFile.close();

var success = 0;
for (var resultIndex = 0; resultIndex < documents.length; resultIndex += 1) if (documents[resultIndex].status === "success") success += 1;
alert("AI 纯净导出完成：" + success + "/" + documents.length);
