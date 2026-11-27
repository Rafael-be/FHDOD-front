// @vitest-environment node
import QRCode from "qrcode";
import { expect, it } from "vitest";

it("biblioteca gera um PNG legível de pelo menos 1024 pixels com margem", async () => {
  const png = await QRCode.toBuffer("https://hospital.org.br/avaliacao/5", {type:"png",width:1024,margin:4,errorCorrectionLevel:"M",color:{dark:"#171717",light:"#FFFFFF"}});
  expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(1024);
  expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(1024);
});
