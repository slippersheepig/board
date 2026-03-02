function tokenize(expr){
  const compact = expr.replace(/\s+/g, '');
  if(!compact) throw new Error('empty');
  if(!/^[0-9+\-*/().]+$/.test(compact)) throw new Error('invalid-char');

  const tokens = [];
  let i = 0;
  while(i < compact.length){
    const ch = compact[i];
    if(/[0-9.]/.test(ch)){
      let j = i + 1;
      while(j < compact.length && /[0-9.]/.test(compact[j])) j++;
      const numStr = compact.slice(i, j);
      if((numStr.match(/\./g) || []).length > 1) throw new Error('invalid-number');
      const num = Number(numStr);
      if(!Number.isFinite(num)) throw new Error('invalid-number');
      tokens.push(num);
      i = j;
      continue;
    }

    if('+-*/()'.includes(ch)){
      const prev = tokens[tokens.length - 1];
      const prevIsOpOrLeftParen = prev === undefined || (typeof prev === 'string' && prev !== ')');
      if(ch === '-' && prevIsOpOrLeftParen){
        tokens.push('u-');
      }else if(ch === '+' && prevIsOpOrLeftParen){
        // 一元 + 忽略
      }else{
        tokens.push(ch);
      }
      i++;
      continue;
    }
    throw new Error('unexpected');
  }
  return tokens;
}

function toRpn(tokens){
  const output = [];
  const stack = [];
  const precedence = { 'u-': 3, '*': 2, '/': 2, '+': 1, '-': 1 };
  const rightAssoc = new Set(['u-']);

  for(const token of tokens){
    if(typeof token === 'number'){
      output.push(token);
      continue;
    }
    if(token === '('){
      stack.push(token);
      continue;
    }
    if(token === ')'){
      while(stack.length && stack[stack.length - 1] !== '('){
        output.push(stack.pop());
      }
      if(stack.pop() !== '(') throw new Error('paren-mismatch');
      continue;
    }

    while(stack.length){
      const top = stack[stack.length - 1];
      if(top === '(') break;
      const higher = precedence[top] > precedence[token];
      const equalAndLeft = precedence[top] === precedence[token] && !rightAssoc.has(token);
      if(higher || equalAndLeft) output.push(stack.pop());
      else break;
    }
    stack.push(token);
  }

  while(stack.length){
    const op = stack.pop();
    if(op === '(' || op === ')') throw new Error('paren-mismatch');
    output.push(op);
  }
  return output;
}

function evalRpn(rpn){
  const stack = [];
  for(const token of rpn){
    if(typeof token === 'number'){
      stack.push(token);
      continue;
    }
    if(token === 'u-'){
      if(stack.length < 1) throw new Error('operand-missing');
      stack.push(-stack.pop());
      continue;
    }
    if(stack.length < 2) throw new Error('operand-missing');
    const b = stack.pop();
    const a = stack.pop();
    let val = 0;
    if(token === '+') val = a + b;
    else if(token === '-') val = a - b;
    else if(token === '*') val = a * b;
    else if(token === '/'){
      if(b === 0) throw new Error('div-by-zero');
      val = a / b;
    }
    if(!Number.isFinite(val)) throw new Error('overflow');
    stack.push(val);
  }
  if(stack.length !== 1) throw new Error('invalid-expr');
  return stack[0];
}

function safeEvaluate(expr){
  return evalRpn(toRpn(tokenize(expr)));
}

export async function init(){
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center">
      <input id="calcExpr" placeholder="例如 12/3 + 4" style="flex:1;padding:6px;border-radius:6px"/>
      <button id="calcGo">计算</button>
    </div>
    <div id="calcOut" style="margin-top:8px;color:var(--muted)"></div>
  `;
  const expr = container.querySelector('#calcExpr');
  const out = container.querySelector('#calcOut');

  function run(){
    try{
      const res = safeEvaluate(expr.value);
      out.textContent = String(Math.round(res * 1e10) / 1e10);
    }catch{
      out.textContent = '表达式错误';
    }
  }

  container.querySelector('#calcGo').addEventListener('click', run);
  expr.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') run(); });
  return container;
}
