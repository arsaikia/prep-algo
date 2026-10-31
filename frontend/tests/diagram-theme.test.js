import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { colorDiagramNodes, DIAGRAM_INK, diagramTheme, PASTEL_NODES } from '../src/components/systemDesign/diagramTheme.js';

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('pastel node labels meet AA contrast in both themes; edges contrast with the canvas', () => {
  for (const dark of [false, true]) {
    const config = diagramTheme(dark);
    assert.equal(config.theme, 'base');
    assert.equal(config.securityLevel, 'strict');
    for (const color of PASTEL_NODES) {
      assert.ok(contrast(color.fill, DIAGRAM_INK) >= 4.5, `label contrast on ${color.fill}`);
      assert.ok(contrast(color.fill, color.border) >= 3, `border contrast on ${color.fill}`);
    }
    const vars = config.themeVariables;
    assert.ok(contrast(vars.lineColor, vars.background) >= 3);
    assert.ok(contrast(vars.signalTextColor, vars.background) >= 4.5);
    assert.ok(contrast(vars.textColor, vars.edgeLabelBackground) >= 4.5);
    assert.ok(contrast(vars.textColor, vars.clusterBkg) >= 4.5);
    assert.match(config.themeCSS, new RegExp(`color: ${vars.textColor}`));
  }
});

test('default nodes get varied pastel colors without overriding authored styles', () => {
  const dom = new JSDOM('');
  try {
    const svg = colorDiagramNodes(`<svg xmlns="http://www.w3.org/2000/svg">
      <g class="node default"><rect class="label-container" /></g>
      <g class="node default"><rect class="label-container" /></g>
      <g class="node default"><rect class="label-container" style="fill: red" /></g>
      <g class="node failure"><rect class="label-container" /></g>
      </svg>`, dom.window.document);
    const template = dom.window.document.createElement('template');
    template.innerHTML = svg;
    const shapes = template.content.querySelectorAll('rect');
    const normalize = (fill) => {
      const shape = dom.window.document.createElement('span');
      shape.style.fill = fill;
      return shape.style.fill;
    };
    assert.equal(shapes[0].style.fill, normalize(PASTEL_NODES[0].fill));
    assert.equal(shapes[1].style.fill, normalize(PASTEL_NODES[1].fill));
    assert.equal(shapes[2].style.fill, 'red');
    assert.equal(shapes[3].style.fill, '');
  } finally {
    dom.window.close();
  }
});
