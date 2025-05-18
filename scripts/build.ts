#!/usr/bin/env bun
import * as esbuild from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const distDir = path.resolve(projectRoot, "dist");

async function getProductionDependencies(): Promise<string[]> {
  const packageJsonPath = path.resolve(projectRoot, "package.json");
  try {
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    return Object.keys(packageJson.dependencies || {});
  } catch (error) {
    console.error("🚨 Error reading root package.json:", error);
    throw error;
  }
}

async function build() {
  console.log("🚀 Starting build process...");

  try {
    console.log(`🧹 Cleaning ${path.relative(projectRoot, distDir)}...`);
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
  } catch (error) {
    console.error("🚨 Error cleaning dist directory:", error);
    process.exit(1);
  }

  const externalDependencies = await getProductionDependencies();
  console.log(
    "📦 Externalizing dependencies:",
    externalDependencies.join(", ") || "None"
  );

  try {
    console.log("📦 Bundling application with esbuild...");
    await esbuild.build({
      entryPoints: [path.resolve(projectRoot, "src/main.ts")],
      bundle: true,
      outfile: path.join(distDir, "main.js"),
      platform: "node",
      format: "esm",
      target: "esnext",
      sourcemap: true,
      minify: false,
      tsconfig: path.resolve(projectRoot, "tsconfig.json"),
      external: externalDependencies,
      loader: {
        ".json": "json",
      },
      logLevel: "info",
      absWorkingDir: projectRoot,
    });
    console.log("✅ esbuild completed successfully.");

    const rootPackageJsonContent = await readFile(
      path.resolve(projectRoot, "package.json"),
      "utf-8"
    );
    const rootPackageJson = JSON.parse(rootPackageJsonContent);
    const distPackageJson = {
      name: `${rootPackageJson.name || "app"}-dist`,
      version: rootPackageJson.version || "1.0.0",
      private: true,
      type: "module",
      main: "main.js",
      dependencies: externalDependencies.reduce(
        (acc, depName) => {
          if (rootPackageJson.dependencies[depName]) {
            acc[depName] = rootPackageJson.dependencies[depName];
          }
          return acc;
        },
        {} as Record<string, string>
      ),
      scripts: {
        start: "node main.js",
      },
      ...(rootPackageJson.engines && { engines: rootPackageJson.engines }),
    };
    await writeFile(
      path.join(distDir, "package.json"),
      JSON.stringify(distPackageJson, null, 2)
    );
    console.log("✅ dist/package.json created.");
    console.log("\n🎉 Build complete! Output in ./dist directory.");
  } catch (error) {
    console.error("🚨 Build failed:", error);
    process.exit(1);
  }
}

build();
