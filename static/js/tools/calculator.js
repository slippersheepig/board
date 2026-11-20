function tokenize(expr) {
  const compact = expr.replace(/\s+/g, '');
  if (!compact) throw new Error('empty');
  if (!/^[0-9+\-*/().]+$/.test(compact)) throw new Error('invalid-char');

  const tokens = [];
  let i = 0;
  while (i < compact.length) {
    const ch = compact[i];
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < compact.length && /[0-9.]/.test(compact[j])) j++;
      const numStr = compact.slice(i, j);
      if ((numStr.match(/\./g) || []).length > 1) throw new Error('invalid-number');
      const num = Number(numStr);
      if (!Number.isFinite(num)) throw new Error('invalid-number');
      tokens.push(num);
      i = j;
      continue;
    }

    if ('+-*/()'.includes(ch)) {
      const prev = tokens[tokens.length - 1];
      const prevIsOpOrLeftParen = prev === undefined || (typeof prev === 'string' && prev !== ')');
      if (ch === '-' && prevIsOpOrLeftParen) {
        tokens.push('u-');
      } else if (ch === '+' && prevIsOpOrLeftParen) {
        // 一元 + 忽略
      } else {
        tokens.push(ch);
      }
      i++;
      continue;
    }
    throw new Error('unexpected');
  }
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  const precedence = { 'u-': 3, '*': 2, '/': 2, '+': 1, '-': 1 };
  const rightAssoc = new Set(['u-']);

  for (const token of tokens) {
    if (typeof token === 'number') {
      output.push(token);
      continue;
    }
    if (token === '(') {
      stack.push(token);
      continue;
    }
    if (token === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') {
        output.push(stack.pop());
      }
      if (stack.pop() !== '(') throw new Error('paren-mismatch');
      continue;
    }

    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top === '(') break;
      const higher = precedence[top] > precedence[token];
      const equalAndLeft = precedence[top] === precedence[token] && !rightAssoc.has(token);
      if (higher || equalAndLeft) output.push(stack.pop());
      else break;
    }
    stack.push(token);
  }

  while (stack.length) {
    const op = stack.pop();
    if (op === '(' || op === ')') throw new Error('paren-mismatch');
    output.push(op);
  }
  return output;
}

function evalRpn(rpn) {
  const stack = [];
  for (const token of rpn) {
    if (typeof token === 'number') {
      stack.push(token);
      continue;
    }
    if (token === 'u-') {
      if (stack.length < 1) throw new Error('operand-missing');
      stack.push(-stack.pop());
      continue;
    }
    if (stack.length < 2) throw new Error('operand-missing');
    const b = stack.pop();
    const a = stack.pop();
    let val = 0;
    if (token === '+') val = a + b;
    else if (token === '-') val = a - b;
    else if (token === '*') val = a * b;
    else if (token === '/') {
      if (b === 0) throw new Error('div-by-zero');
      val = a / b;
    }
    if (!Number.isFinite(val)) throw new Error('overflow');
    stack.push(val);
  }
  if (stack.length !== 1) throw new Error('invalid-expr');
  return stack[0];
}

function safeEvaluate(expr) {
  return evalRpn(toRpn(tokenize(expr)));
}

function formatResult(num) {
  const rounded = Number(num.toPrecision(12));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export async function init() {
  const container = document.createElement('div');
  container.className = 'calc-widget';
  container.innerHTML = `
    <div class="calc-screen-wrap">
      <input id="calcExpr" class="calc-screen" placeholder="0" aria-label="计算表达式" inputmode="decimal" autocomplete="off" spellcheck="false" />
      <div id="calcOut" class="calc-out">点击数字和运算符开始计算</div>
    </div>
    <div class="calc-pad" role="group" aria-label="计算器按键">
      <button type="button" class="calc-key calc-key-fn" data-val="clear">C</button>
      <button type="button" class="calc-key calc-key-fn" data-val="(">(</button>
      <button type="button" class="calc-key calc-key-fn" data-val=")">)</button>
      <button type="button" class="calc-key calc-key-op" data-val="/">÷</button>

      <button type="button" class="calc-key" data-val="7">7</button>
      <button type="button" class="calc-key" data-val="8">8</button>
      <button type="button" class="calc-key" data-val="9">9</button>
      <button type="button" class="calc-key calc-key-op" data-val="*">×</button>

      <button type="button" class="calc-key" data-val="4">4</button>
      <button type="button" class="calc-key" data-val="5">5</button>
      <button type="button" class="calc-key" data-val="6">6</button>
      <button type="button" class="calc-key calc-key-op" data-val="-">-</button>

      <button type="button" class="calc-key" data-val="1">1</button>
      <button type="button" class="calc-key" data-val="2">2</button>
      <button type="button" class="calc-key" data-val="3">3</button>
      <button type="button" class="calc-key calc-key-op" data-val="+">+</button>

      <button type="button" class="calc-key calc-key-fn" data-val="back">⌫</button>
      <button type="button" class="calc-key" data-val="0">0</button>
      <button type="button" class="calc-key" data-val=".">.</button>
      <button type="button" class="calc-key calc-key-eq" data-val="=">=</button>
    </div>
  `;

  const expr = container.querySelector('#calcExpr');
  const out = container.querySelector('#calcOut');
  const isTouch = matchMedia('(pointer: coarse)').matches;

  function normalizeExpr(value) {
    return (value || '').replace(/[^0-9+\-*/().]/g, '');
  }

  function run() {
    try {
      const res = safeEvaluate(expr.value);
      out.textContent = formatResult(res);
    } catch (err) {
      if (err?.message === 'empty') {
        out.textContent = '请输入表达式';
      } else if (err?.message === 'div-by-zero') {
        out.textContent = '不能除以 0';
      } else {
        out.textContent = '表达式错误';
      }
    }
  }

  container.querySelectorAll('.calc-key').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === 'clear') {
        expr.value = '';
        out.textContent = '已清空';
        return;
      }
      if (val === 'back') {
        expr.value = expr.value.slice(0, -1);
        out.textContent = expr.value ? '继续输入' : '已清空';
        return;
      }
      if (val === '=') {
        run();
        return;
      }
      expr.value += val;
      out.textContent = '继续输入';
      if (!isTouch) expr.focus();
    });
  });

  expr.addEventListener('input', () => {
    const cleaned = normalizeExpr(expr.value);
    if (cleaned !== expr.value) expr.value = cleaned;
    out.textContent = expr.value ? '继续输入' : '已清空';
  });

  expr.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
      return;
    }
    if (event.key === 'Escape') {
      expr.value = '';
      out.textContent = '已清空';
    }
  });

  container.onToolShow = () => {
    if (!isTouch) {
      expr.focus();
      const end = expr.value.length;
      expr.setSelectionRange(end, end);
    }
  };

  return container;
}
