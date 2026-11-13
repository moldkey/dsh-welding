/**
 * dsh-welding — 焊接工艺参数与缺陷排查
 */

export const name = "dsh-welding";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

const PROCESS = {
  mig: { name: "MIG/MAG 焊", minT: 0.8, curPerMm: 35, gas: "Ar/CO2 混合" },
  tig: { name: "TIG 氩弧焊", minT: 0.5, curPerMm: 25, gas: "Ar" },
  stick: { name: "手工电弧焊", minT: 1.5, curPerMm: 30, gas: "药皮自保护" },
  laser: { name: "激光焊", minT: 0.3, curPerMm: 0, gas: "N2/Ar" },
  spot: { name: "电阻点焊", minT: 0.5, curPerMm: 0, gas: "无" },
};

const DEFECTS = {
  porosity: ["气孔", "保护气不足、母材有油锈、焊丝受潮", "清理母材、加大气流量、烘干焊丝"],
  undercut: ["咬边", "电流过大、运条过快、角度不对", "降电流、放慢速度、调整焊枪角度"],
  crack: ["裂纹", "冷却过快、硫磷偏高、拘束应力大", "预热、缓冷、换低氢焊材"],
  spatter: ["飞溅", "电流偏高、气体不纯、干伸长过长", "调电流、换气、缩短干伸长"],
  distortion: ["变形", "热输入大、焊接顺序不对、未刚性固定", "分段退焊、控制热输入、夹具固定"],
};

function n(v, d) { const x = Number(v); return Number.isFinite(x) ? x : d; }

const TOOLS = {
  welding_params: {
    description: "焊接参数建议：按工艺、板厚给出电流范围、气流量与预热要求",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        process: { type: "string", enum: ["mig", "tig", "stick", "laser", "spot"], description: "焊接工艺" },
        thickness: { type: "number", description: "板厚 mm" },
        material: { type: "string", description: "材料，如 carbon steel / stainless / aluminum（可选）" },
      },
      required: ["process", "thickness"],
    },
    run(args) {
      const p = PROCESS[String(args.process || "").toLowerCase()];
      if (!p) throw new Error("工艺支持: mig / tig / stick / laser / spot");
      const T = n(args.thickness, 0);
      if (T <= 0) throw new Error("板厚必须大于 0");
      const base = Math.round(T * p.curPerMm);
      const lines = ["焊接参数建议", "=".repeat(52), "工艺: " + p.name, "板厚: " + T + " mm", "材料: " + String(args.material || "未填"), ""];
      if (p.curPerMm > 0) {
        const lo = Math.max(20, Math.round(base * 0.8));
        const hi = Math.round(base * 1.2);
        lines.push("电流范围: " + lo + " ~ " + hi + " A");
      } else {
        lines.push("电流: 按设备与焊点尺寸设定（点焊/激光以能量与时间为主）");
      }
      lines.push("保护气: " + p.gas);
      const preheat = T >= 12 ? "建议预热 100~150°C（厚板/高碳当量）" : "一般无需预热";
      lines.push("预热: " + preheat);
      if (T < p.minT) lines.push("提醒: 低于该工艺推荐最小板厚 " + p.minT + " mm");
      lines.push("");
      lines.push("参数为经验起点，实际按焊机特性、接头形式与试焊结果调整。");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
  welding_defect: {
    description: "焊接缺陷排查：按缺陷名给出常见原因与处理建议",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        defect: { type: "string", enum: ["porosity", "undercut", "crack", "spatter", "distortion"], description: "缺陷类型" },
      },
      required: ["defect"],
    },
    run(args) {
      const d = DEFECTS[String(args.defect || "").toLowerCase()];
      if (!d) throw new Error("支持: " + Object.keys(DEFECTS).join(" / "));
      const lines = ["焊接缺陷排查", "=".repeat(52), "缺陷: " + d[0], "", "常见原因: " + d[1], "处理建议: " + d[2], "",
        "更多工具：" + SITE];
      return lines.join(NL);
    },
  },
};

export function apply(ctx, config) {
  void config;
  for (const name of Object.keys(TOOLS)) {
    const t = TOOLS[name];
    ctx.tools.register({
      name: name,
      description: t.description,
      parameters: t.parameters,
      output: TEXT_OUTPUT,
      async execute(args) { try { return { text: t.run(args || {}) }; } catch (e) { return { text: "处理失败: " + String((e && e.message) || e) }; } },
    });
  }
}
