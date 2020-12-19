
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const prettier = require("prettier");

if (!process.argv[4]) {
    console.error("Please specify a config file, source and output directory.");
    return;
}

const processDir = process.cwd();
const config = require(path.join(processDir, process.argv[2]));

const sourceDir = path.join(processDir, process.argv[3]);
const outputDir = path.join(processDir, process.argv[4]);

const layout = handlebars.compile(fs.readFileSync(path.join(sourceDir, "layout.hbs"), "utf8"));

const recursiveFind = (path, callback) => {
    fs.readdirSync(path).sort().forEach((file) => {
        const fullPath = `${path}/${file}`;
        if (fs.lstatSync(fullPath).isDirectory()) recursiveFind(fullPath, callback);
        else callback(fullPath);
    });
}

const createDir = (path) => {
    if (!fs.existsSync(path)) fs.mkdirSync(path);
}

recursiveFind(sourceDir, (filePath) => {
    if (!(filePath.endsWith(".hbs") || filePath.endsWith(".handlebars"))) return;

    let file = fs.readFileSync(filePath, "utf8");
    const lines = file.split("\n");
    const pageTitle = lines[0].replace("<!--", "").replace("-->", "");
    file = lines.shift();
    file = lines.join("\n");

    const relativePath = path.relative(sourceDir, filePath);
    const parsedRelPath = path.parse(relativePath);

    let fullDir = outputDir;
    let isPartial = false;
    parsedRelPath.dir.split("\\").forEach((directory) => {
        fullDir += "/" + directory;

        if (parsedRelPath.name == "layout") {
            isPartial = true;
            return;
        }

        if (isPartial || fullDir.includes("_partials")) {
            isPartial = true;
            handlebars.registerPartial(parsedRelPath.name,  handlebars.compile(file));
            return;
        }

        createDir(fullDir);
    });

    if (isPartial) return;

    fs.writeFileSync(
        path.join(
            outputDir,
            relativePath.replace(".hbs", ".html").replace(".handlebars", ".html")
        ),
        prettier.format(
            layout({
                site_name: config.site_name,
                page_name: pageTitle,
                body: handlebars.compile(file)(config)
            }),
            {
                tabWidth: 4,
                trailingComma: "none",
                bracketSpacing: false,
                semi: false,
                embeddedLanguageFormatting: "auto",
                parser: "html"
            }
        )
    );
});