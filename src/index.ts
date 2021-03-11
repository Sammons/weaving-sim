import { formatDiagnostic } from "typescript"

const inchesBetweenNails = 0.3625;
const inchesPerYard = 36;

const state = {
  recentPicks: [] as string[],
  currentPick: "#0ff0ff",
  currentNails: 1,
  useHexCodes: false,
  selectedRows: [] as number[],
  entries: [] as {
    idx: number;
    nails: number;
    color: string;
    selected: boolean;
  }[]
}

function createElementFromHTML(htmlString: string) {
  var div = document.createElement('tbody');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstElementChild!;
}

const constructRow = (value: typeof state['entries'][number]) => {
  const proto = document.getElementById(elementIds.protoTable);
  const html = proto!.innerHTML;
  const row = createElementFromHTML(html);
  const cells = Array.from(row.children)
  cells[0].innerHTML = String(value.idx);
  const input = cells[1].firstElementChild as HTMLInputElement;
  input.onchange = (ev => {
    const t = ev.target as HTMLInputElement;
    if (Number.isFinite(t.valueAsNumber)) {
      value.nails = t.valueAsNumber;
      updateDom();
    }
  })
  input.value = String(value.nails)
  cells[2].setAttribute('style', `background-color: ${value.color};`);
  cells[3].innerHTML = value.selected ? '✓' : '';
  [cells[0], cells[2], cells[3]].forEach(td => {
    td.addEventListener('click', () => {
      value.selected = !value.selected
      cells[3].innerHTML = value.selected ? '✓' : '';
      if (value.selected) {
        state.selectedRows.push(value.idx);
      } else {
        const idx = state.selectedRows.findIndex(el => el === value.idx);
        state.selectedRows.splice(idx, 1);
      }
      state.selectedRows.sort((a, b) => a - b)
    })
  });
  return row;
}
const updateLink = () => {
  const data = btoa(JSON.stringify(state.entries));
  const base = window.location.toString().replace(/\?=?.*/, '');
  const appended = ('#data=' + data)
  const link = (base + appended).replace(/#+/, '#');
  const linkText = document.getElementById(elementIds.linkText) as HTMLInputElement;
  linkText.value = link;
}

const updateDom = () => {
  try {
    console.log('updating table')
    const table = document.getElementById(elementIds.dataTable);
    state.entries.sort((a, b) => a.idx - b.idx);
    state.entries.forEach((e, i) => {
      e.idx = i;
    })
    if (table) {
      Array.from(table.children).forEach(c => c.remove());
      state.entries.forEach(entry => {
        table.appendChild(constructRow(entry))
      })
    }
    const quickPicks = Array.from(document.getElementsByClassName('quick-pick')).sort((a, b) => {
      return Number(a.id.split('-')!.pop()) - Number(b.id.split('-')!.pop())
    });
    for (let i = 0; i < quickPicks.length; ++i) {
      if (state.recentPicks[i] != null) {
        quickPicks[i].removeAttribute('hidden');
        quickPicks[i].setAttribute('style', `background-color: ${state.recentPicks[i]};`);
        (quickPicks[i] as any)['_val'] = state.recentPicks[i];
        if (!(quickPicks[i] as any)['listener']) {
          quickPicks[i].addEventListener('click', () => {
            setHexInputsToValue((quickPicks[i] as any)['_val'] as string)
          });
          (quickPicks[i] as any)['listener'] = true;
        }
      } else {
        quickPicks[i].setAttribute('hidden', "true")
      }
    }
    // estimates
    const nailsTotal = document.getElementById(elementIds.nailsTotal);
    let nailSum = 0;
    state.entries.forEach(e => nailSum += e.nails);
    if (nailsTotal) {
      nailsTotal.innerHTML = String(nailSum);
    }
    const yardage = document.getElementById(elementIds.yardsTotal);
    const fringe = document.getElementById(elementIds.yardsFringe);
    if (yardage) {
      let lengthOfOneSide = nailSum * inchesBetweenNails;
      let lengthOfDiagonal = Math.sqrt(2 * (lengthOfOneSide * lengthOfOneSide)) * 2;
      let netInches = nailSum * lengthOfDiagonal;
      let yards = netInches / inchesPerYard;
      const roundNum = (n: number) => {
        const m = String(n).match(/(\d+\.?\d{0,2})\d*/);
        return m ? m[1] : "";
      }
      yardage.innerHTML = roundNum(yards);
      const _6InchFringeLengthPerNail = 12.0;
      const _6InchFringeNeeded = _6InchFringeLengthPerNail * nailSum;
      fringe!.innerHTML = `${roundNum(_6InchFringeNeeded / inchesPerYard)}`
    }
    // capture
    recalculateCanvas();
    // save state
    localStorage.setItem('state-v1', JSON.stringify(state));
    updateLink();
  } catch (e) {
    console.log(e)
  }
}

const recalculateCanvas = () => {
  let nailSum = 0;
  state.entries
    .sort((a, b) => a.idx - b.idx)
    .forEach(e => nailSum += e.nails);
  if (state.entries.length === 0) {
    return;
  }
  const coordinates = [] as { x: number; y: number; }[];
  let curEntry = 0;
  let strokeLen = 0;
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    for (let i = 0; i < nailSum + 1; ++i) {
      let width = canvas.width;
      let height = canvas.height;
      let offset = width / nailSum;
      let p1 = { x: i * offset, y: height };
      let p2 = { y: i * offset, x: width };
      let p3 = { x: (nailSum - i) * offset, y: 0 };
      let p4 = { y: (nailSum - i) * offset, x: 0 }
      if (i == 0) {
        context.moveTo(p1.x, p1.y);
      } else {
        context.lineTo(p1.x, p1.y);
      }
      context.lineTo(p2.x, p2.y);
      context.lineTo(p3.x, p3.y);
      context.lineTo(p4.x, p4.y);
      context.lineTo(p1.x, p1.y);
      if (strokeLen >= state.entries[curEntry].nails) {
        context.strokeStyle = state.entries[curEntry].color;
        context.stroke();
        context.closePath();
        context.beginPath();
        if (curEntry + 1 < state.entries.length) {
          curEntry++;
        }
        strokeLen = 0;
      } else {
        strokeLen++;
      }
    }
    context.strokeStyle = state.entries[curEntry].color;
    context.stroke();
  }
}

const addSelectionToTable = () => {
  if (state.currentPick == null || state.currentNails == null || state.currentNails < 1) {
    console.log('skipping adding selection, invalid form')
    return;
  }
  state.entries.push({
    idx: state.entries.length,
    color: state.currentPick,
    selected: false,
    nails: state.currentNails
  });
  if (!new Set(state.recentPicks).has(state.currentPick)) {
    state.recentPicks.unshift(state.currentPick);
  }
  updateDom();
}

const copyRows = () => {
  const selected = new Set(state.selectedRows)
  const currentValues = state.entries.filter(e => {
    return selected.has(e.idx)
  });
  currentValues.forEach(v => {
    state.entries.push({
      idx: state.entries.length,
      color: v.color,
      selected: false,
      nails: v.nails
    });
  });
  updateDom();
}

const deleteRows = () => {
  const selected = new Set(state.selectedRows)
  const currentValues = state.entries.filter(e => {
    return selected.has(e.idx)
  });
  currentValues.forEach(v => {
    const curIdx = state.entries.findIndex(e => {
      return e.idx === v.idx;
    });
    state.entries.splice(curIdx, 1);
  });
  state.selectedRows = [];
  updateDom();
}

const setHexInputsToValue = (hex: string) => {
  const hexEl = document.getElementById(elementIds.hexColorInput) as HTMLInputElement;
  const colorEl = document.getElementById(elementIds.normalColorInput) as HTMLInputElement;
  if (hex != null) {
    if (hex.match(/#[0-9a-fA-F]{6}/gm)) {
      hexEl.value = hex;
      colorEl.value = hex;
      state.currentPick = hex;
      return true;
    } else {
      hexEl.value = "";
      return false
    }
  }
}

const hexColorInputHandler = (e: Event) => {
  const value = (e.target as unknown as { value: string })?.value;
  if (value != null) {
    setHexInputsToValue(value);
  }
}
const normalColorInputHandler = (e: Event) => {
  return hexColorInputHandler(e);
}
const numberOfNailsInputHandler = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const value = el.valueAsNumber;
  if (Number.isFinite(value)) {
    state.currentNails = value;
  } else {
    el.value = "";
  }
}

const reverseRows = () => {
  const selected = new Set(state.selectedRows)
  const currentValues = state.entries.filter(e => {
    return selected.has(e.idx)
  });
  const reversedIndexes = currentValues.map(v => v.idx).reverse();
  for (let i = 0; i < currentValues.length; ++i) {
    currentValues[i].idx = reversedIndexes[i];
  }
  updateDom();
}
const elementIds = {
  normalColorInput: 'color-selection',
  normalColorInputLabel: 'color-selection-label',
  hexColorInput: 'hex-color-selection',
  hexColorInputLabel: 'hex-color-selection-label',
  toggleHexInput: 'color-selection-type',
  numberOfNailsInput: 'nail-selection',
  addSelectionButton: 'add-selection',
  copyRows: 'copy-rows',
  reverseRows: 'reverse-rows',
  deleteRows: 'delete-rows',
  dataTable: 'data-table',
  protoTable: 'prototype-row-container',
  nailsTotal: 'nails-total',
  yardsTotal: 'yards-total',
  yardsFringe: 'yards-fringe',
  copyLink: 'copy-link',
  linkText: 'link-text'
}

const toggleHexInputHandler = (e: Event) => {
  const checkbox = e.target as HTMLInputElement;
  const checked = checkbox.checked;
  state.useHexCodes = checked;
  const el = document.getElementById(elementIds.normalColorInput);
  const label = document.getElementById(elementIds.normalColorInputLabel);
  const el2 = document.getElementById(elementIds.hexColorInput);
  const label2 = document.getElementById(elementIds.hexColorInputLabel);
  if (el) {
    el.hidden = state.useHexCodes;
  }
  if (label) {
    label.hidden = state.useHexCodes;
  }
  if (el2) {
    el2.hidden = !state.useHexCodes
  }
  if (label2) {
    label2.hidden = !state.useHexCodes
  }
}


const fixedElementHandlers = {
  addSelectionButton: addSelectionToTable,
  copyRows: copyRows,
  deleteRows: deleteRows,
  // TODO: needs to pass el
  hexColorInput: hexColorInputHandler,
  normalColorInput: normalColorInputHandler,
  numberOfNailsInput: numberOfNailsInputHandler,
  reverseRows: reverseRows,
  toggleHexInput: toggleHexInputHandler
};

const handlers = () => {
  const el = document.getElementById(elementIds.toggleHexInput) as HTMLInputElement | undefined;
  if (el) {
    el.checked = state.useHexCodes;
  }
  const colorInput = document.getElementById(elementIds.hexColorInput) as HTMLInputElement;
  if (colorInput) {
    setHexInputsToValue(state.currentPick);
  }
  const nailInput = document.getElementById(elementIds.numberOfNailsInput) as HTMLInputElement;
  if (nailInput) {
    nailInput.value = String(state.currentNails);
  }
  // fixed handlers
  Object.keys(fixedElementHandlers).forEach(key => {
    const k = key as keyof typeof fixedElementHandlers;
    const element = document.getElementById(elementIds[k]);
    const configuredHandler = fixedElementHandlers[k];
    fixedElementHandlers[k] = ((event: Event) => {
      return configuredHandler(event);
    }) as unknown as (() => void);
    if (element) {
      element.addEventListener('change', (e) => {
        return fixedElementHandlers[k](e)
      })
      element.addEventListener('click', (e) => {
        return fixedElementHandlers[k](e)
      })
    }
  });
  const stored = localStorage.getItem('state-v1');
  if (stored) {
    Object.assign(state, JSON.parse(stored));
  }
  if (window.location.hash && window.location.hash.includes('=')) {
    const hashData = window.location.hash.replace('#data=', '');
    try {
      console.log(hashData)
      state.entries = JSON.parse(atob(hashData))
    } catch (e) {
      console.log(e);
    }
    window.location.hash = ""
  }
  updateDom();
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement
canvas.width = 512;
canvas.height = 512;
const context = canvas!.getContext('2d');
if (context) {
  context.fillStyle = 'blue'
  context.fillRect(0, 0, canvas.width, canvas.height)
}
const main = () => {
  handlers();
}

main();