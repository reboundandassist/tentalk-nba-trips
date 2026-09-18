const wallButton = document.querySelector('.all-star-toggle');
const wall = document.querySelector('#remaining-all-stars');
wallButton.addEventListener('click', () => {
  const open = wallButton.getAttribute('aria-expanded') !== 'true';
  wallButton.setAttribute('aria-expanded', String(open));
  wallButton.textContent = open ? '收起All-Star名單 ↑' : '查看 36 位 NBA All-Stars ↓';
  wall.hidden = !open;
  if (open && !reduceMotion) wall.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 180 });
});
const quizForm = document.querySelector('#quiz-form');
const quizResult = document.querySelector('#quiz-result');
quizForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!quizForm.reportValidity()) return;
  const data = new FormData(quizForm);
  const count = ['q1', 'q2', 'q3'].filter((name) => data.get(name) === 'B').length;
  const key = count === 3 ? 'A' : count === 0 ? 'C' : 'B';
  quizResult.querySelector('h3').textContent = { A: '瘋狂季後賽球迷', B: '彈性型NBA旅客', C: '舒適型NBA球迷' }[key];
  quizResult.querySelector('.result-copy').replaceChildren(document.querySelector(`#quiz-result-${key}`).content.cloneNode(true));
  quizResult.hidden = false;
  quizForm.hidden = true;
  quizResult.focus();
});
document.querySelector('#quiz-reset').addEventListener('click', () => {
  quizForm.reset(); quizForm.hidden = false; quizResult.hidden = true;
  quizForm.querySelector('input').focus();
});
const calculatorForm = document.querySelector('#calculator-form');
const calculatorResult = document.querySelector('#calculator-result');
const calcField = (name) => calculatorForm.elements.namedItem(name);
function constrainOptions(name, max, min = 0) {
  const field = calcField(name), previous = field.value;
  field.replaceChildren(new Option('請選擇', ''));
  field.disabled = !Number.isFinite(max) || max < min;
  if (!field.disabled) for (let n = min; n <= max; n++) field.add(new Option(String(n), String(n)));
  field.value = previous !== '' && !field.disabled ? String(Math.min(Number(previous), max)) : '';
}
function constrainCalculator() {
  const games = calcField('games').value === '' ? NaN : Number(calcField('games').value);
  constrainOptions('stars', games);
  constrainOptions('cities', games, 1);
  const cities = calcField('cities').value === '' ? NaN : Number(calcField('cities').value);
  constrainOptions('major', cities);
}
calculatorForm.addEventListener('change', () => {
  constrainCalculator(); calculatorResult.hidden = true;
  document.querySelector('#calculator-status').textContent = '';
});
const money = (value) => Math.round(value).toLocaleString('en-HK');
function renderDefinitionList(target, entries) {
  target.replaceChildren(...entries.map(([label, value]) => {
    const row = document.createElement('div'), term = document.createElement('dt'), definition = document.createElement('dd');
    term.textContent = label; definition.textContent = value; row.append(term, definition); return row;
  }));
}
calculatorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!calculatorForm.reportValidity() || [...calculatorForm.querySelectorAll('select')].some((field) => field.value === '')) return;
  const input = Object.fromEntries(new FormData(calculatorForm));
  ['games', 'stars', 'cities', 'major', 'round', 'occupants'].forEach((name) => input[name] = Number(input[name]));
  const result = calculateTrip(input);
  document.querySelector('#cost-headline').textContent = `每人預計旅程成本：HKD ${money(result.lower)}–${money(result.upper)}`;
  renderDefinitionList(document.querySelector('#cost-breakdown'), Object.entries({ airfare: '香港至美國來回機票', domestic: '美國內陸交通／機票', hotel: '酒店', tickets: '比賽門票', local: 'Uber、當地交通及膳食' }).map(([key, label]) => [label, `HKD ${money(Math.round(result.categories[key] / 100) * 100)}`]));
  renderDefinitionList(document.querySelector('#cost-recap'), [
    ['比賽', `${input.games}場`], ['巨星／高需求比賽', `${input.stars}場`], ['城市', `${input.cities}個`], ['主要城市', `${input.major}個`],
    ...['travel', 'round', 'seat', 'occupants'].map((name) => [({ travel: '內陸移動', round: '季後賽階段', seat: '座位', occupants: '酒店安排' })[name], calcField(name).selectedOptions[0].textContent]),
    ['住宿', `${result.nights}晚`], ['旅程', `${result.days}日`], ['內陸主要交通', `${result.legs}段`],
  ]);
  calculatorResult.hidden = false; calculatorResult.focus();
});
document.querySelector('#calculator-adjust').addEventListener('click', () => {
  calculatorResult.hidden = true;
  document.querySelector('#calculator-status').textContent = '已保留你嘅選擇，調整選項後再估算。';
  calcField('games').focus();
  calculatorForm.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
});
calculatorForm.addEventListener('reset', () => {
  calculatorResult.hidden = true;
  window.setTimeout(() => { constrainCalculator(); calcField('games').focus(); }, 0);
});

const interestForm = document.querySelector('.newsletter-form');
const interestStatus = interestForm.querySelector('.form-status');
const interestSubmit = interestForm.querySelector('.form-submit');
const endpoint = window.TENTALK_FORM_ENDPOINT;
const formConfigured = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint);
let interestBusy = false, interestCompleted = false;
if (formConfigured) { interestSubmit.disabled = false; interestStatus.textContent = ''; }
interestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (interestBusy || interestCompleted || !formConfigured) return;
  let firstInvalid;
  for (const name of ['name', 'email', 'consent']) {
    const field = interestForm.elements.namedItem(name);
    const valid = field.checkValidity() && (name === 'consent' || field.value.trim() !== '');
    field.setAttribute('aria-invalid', String(!valid));
    document.querySelector(`#error-${name}`).textContent = valid ? '' : { name: '請填寫姓名。', email: '請填寫有效電郵地址。', consent: '請確認你同意以上資料用途。' }[name];
    if (!valid && !firstInvalid) firstInvalid = field;
  }
  if (firstInvalid) { interestStatus.textContent = '請檢查標示欄位。'; firstInvalid.focus(); return; }
  if (interestForm.elements.namedItem('_gotcha').value) return;
  const data = new FormData(interestForm);
  data.set('name', data.get('name').trim()); data.set('email', data.get('email').trim());
  data.set('future_interest', data.has('future_interest') ? 'Yes' : 'No');
  data.set('submitted_at', new Date().toISOString());
  interestBusy = true; interestSubmit.disabled = true;
  interestStatus.classList.remove('is-error'); interestStatus.textContent = '正在安全提交…';
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error('Submission rejected');
    const body = await response.json();
    if (body.ok !== true) throw new Error('Submission unconfirmed');
    interestCompleted = true; interestForm.reset();
    interestStatus.textContent = '多謝你！一般興趣資料已提交，TenTalk會在有相關資訊時聯絡。提交並不代表確認任何旅程或名額。';
    interestSubmit.textContent = '已提交 ✓';
  } catch {
    interestStatus.classList.add('is-error');
    interestStatus.textContent = '未能確認提交成功。如果你已收到確認，請勿再次提交；否則請稍後再試。';
  } finally {
    window.clearTimeout(timer); interestBusy = false; interestSubmit.disabled = interestCompleted;
  }
});
