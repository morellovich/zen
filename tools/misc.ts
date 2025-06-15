import { exec } from 'node:child_process';
import { glob, readFile, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class Misc {
  static async incrementPatch() {
    const packageFile = await readFile('package.json');
    const packageJson = JSON.parse(packageFile.toString());
    const currentVersion = packageJson.version as string;
    const lastDecimalIndex = currentVersion.lastIndexOf('.');
    const currentPatch = +currentVersion.substring(lastDecimalIndex + 1, currentVersion.length);
    const newPatch = (currentPatch + 1).toString();
    const newVersion = currentVersion.substring(0, lastDecimalIndex + 1) + newPatch;
    packageJson.version = newVersion;
    await writeFile('package.json', JSON.stringify(packageJson));
    await this.execLocal(`prettier --write package.json`);
    console.log(`Incremented patch version to ${newVersion}`);
  }

  static async incrementMinor() {
    const packageFile = await readFile('package.json');
    const packageJson = JSON.parse(packageFile.toString());
    const currentVersion = packageJson.version as string;
    const firstDecimalIndex = currentVersion.indexOf('.');
    const lastDecimalIndex = currentVersion.lastIndexOf('.');
    const currentMinor = +currentVersion.substring(firstDecimalIndex + 1, lastDecimalIndex);
    const newMinor = (currentMinor + 1).toString();
    const newVersion = currentVersion.substring(0, firstDecimalIndex + 1) + newMinor + '.0';
    packageJson.version = newVersion;
    await writeFile('package.json', JSON.stringify(packageJson));
    await this.execLocal(`prettier --write package.json`);
    console.log(`Incremented minor version to ${newVersion}`);
  }

  static async incrementMajor() {
    const packageFile = await readFile('package.json');
    const packageJson = JSON.parse(packageFile.toString());
    const currentVersion = packageJson.version as string;
    const firstDecimalIndex = currentVersion.indexOf('.');
    const currentMajor = +currentVersion.substring(0, firstDecimalIndex);
    const newMajor = (currentMajor + 1).toString();
    const newVersion = newMajor + '.0.0';
    packageJson.version = newVersion;
    await writeFile('package.json', JSON.stringify(packageJson));
    await this.execLocal(`prettier --write package.json`);
    console.log(`Incremented major version to ${newVersion}`);
  }

  static async deployApi() {
    const packageFile = await readFile('package.json');
    const packageJson = JSON.parse(packageFile.toString());
    const versionAddress = `zenacr.azurecr.io/api:${packageJson.version}`;
    const latestAddress = `zenacr.azurecr.io/api:latest`;
    await this.execSystem(`docker tag zen-api ${versionAddress}`);
    await this.execSystem(`docker tag zen-api ${latestAddress}`);
    await this.execSystem(`docker push ${versionAddress}`);
    await this.execSystem(`docker push ${latestAddress}`);
    await this.execSystem(`kubectl set image deployments/zen-api zen-api=${versionAddress}`);
  }

  static async clean(pattern: string | string[]) {
    const promises = [];
    for await (const path of glob(pattern)) {
      promises.push(rm(path, { recursive: true }));
    }
    return Promise.all(promises);
  }

  static execSystem(command: string) {
    console.log(command);
    return execAsync(command).then(({ stdout, stderr }) => {
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
    });
  }

  static execLocal(command: string) {
    return this.execSystem('npx ' + command);
  }
}
