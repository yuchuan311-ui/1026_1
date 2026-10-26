let canvasInstance; // 儲存 p5.js 畫布物件
let questions; // 儲存六道測驗題目
let currentQuestion = 0; // 儲存目前題目索引
let answers = []; // 儲存每一題的作答索引
let submitted = false; // 記錄是否已經交卷
let scoreVisible = false; // 記錄是否已經按下查看成績
let scorePercent = 0; // 儲存測驗百分比
let scoreCount = 0; // 儲存答對題數
let dragIndex = -1; // 儲存目前被拖曳的選項索引
let dragX = 0; // 儲存拖曳中的滑鼠或觸控 X 座標
let dragY = 0; // 儲存拖曳中的滑鼠或觸控 Y 座標
let layout = {}; // 儲存響應式版面座標
let confettiPieces = []; // 儲存彩帶動畫物件
let animationPhase = 0; // 儲存內建動畫目前的相位
let animationSeed = 0; // 儲存內建動畫的預設種子
let interfaceFont = "Noto Sans TC, Microsoft JhengHei, sans-serif"; // 設定介面使用的繁體中文字型

function preload() { // 執行 p5.js 預先載入階段
  animationSeed = 17; // 設定不依賴外部檔案的動畫初始值
} // 結束 p5.js 預先載入階段

function setup() { // 建立畫布並初始化測驗資料
  canvasInstance = createCanvas(windowWidth, windowHeight); // 建立符合視窗大小的畫布
  canvasInstance.elt.setAttribute("aria-label", "p5.js 拖曳題測驗畫布"); // 為畫布加入無障礙描述
  textFont(interfaceFont); // 設定 p5.js 文字繪製字型
  textWrap(WORD); // 讓長題目可以依寬度自動換行
  questions = createQuestions(); // 建立六道完整題目與各自六個選項
  answers = new Array(questions.length).fill(null); // 將每一題預設為空答案
  layoutCanvas(); // 第一次計算響應式版面位置
  const loadingElement = document.getElementById("loading"); // 取得 HTML 載入提示元素
  if (loadingElement !== null) { // 確認載入提示元素存在
    loadingElement.hidden = true; // p5.js 成功啟動後隱藏載入提示
  } // 結束載入提示元素判斷
} // 結束畫布與資料初始化

function draw() { // 每一幀繪製完整測驗畫面
  layoutCanvas(); // 持續更新版面以支援視窗尺寸變化
  background("#08111f"); // 清除畫布並設定深色背景
  animationPhase += 0.018; // 推進內建動畫的時間相位
  drawTopBar(); // 繪製標題與目前題號
  drawAnimationDemo(); // 繪製內建 p5.js 動畫示範區
  drawAnswerZone(); // 繪製動畫下方的作答拖放區
  drawQuestionPanel(); // 繪製題目與六個文字選項
  drawNavigation(); // 繪製上一題、下一題、交卷與成績按鈕
  if (dragIndex !== -1) { // 判斷目前是否有選項正在拖曳
    drawDraggedChoice(); // 將被拖曳的選項繪製在游標或手指旁
  } // 結束拖曳中判斷
  if (scoreVisible && scorePercent > 60) { // 僅在成績嚴格大於百分之六十時啟動彩帶
    drawConfetti(); // 更新並繪製彩帶動畫
  } // 結束彩帶條件判斷
} // 結束每一幀畫面繪製

function windowResized() { // 處理瀏覽器視窗尺寸變更
  resizeCanvas(windowWidth, windowHeight); // 將畫布調整為最新視窗尺寸
  layoutCanvas(); // 重新計算所有介面元件位置
} // 結束視窗尺寸變更處理

function mousePressed() { // 處理滑鼠按下事件
  const pointerX = mouseX; // 取得滑鼠目前 X 座標
  const pointerY = mouseY; // 取得滑鼠目前 Y 座標
  if (handleNavigationPress(pointerX, pointerY)) { // 優先處理底部導覽按鈕
    return false; // 阻止瀏覽器執行預設滑鼠行為
  } // 結束導覽按鈕判斷
  if (!submitted) { // 只有交卷前可以開始拖曳選項
    const pickedIndex = findChoiceAt(pointerX, pointerY); // 找出滑鼠按下位置對應的選項
    if (pickedIndex !== -1) { // 確認確實按到某個選項
      dragIndex = pickedIndex; // 設定目前被拖曳的選項索引
      dragX = pointerX; // 記錄拖曳起點 X 座標
      dragY = pointerY; // 記錄拖曳起點 Y 座標
      return false; // 阻止瀏覽器執行預設滑鼠行為
    } // 結束選項按下判斷
  } // 結束交卷前判斷
  return false; // 阻止畫布的預設滑鼠行為
} // 結束滑鼠按下事件

function mouseDragged() { // 處理滑鼠拖曳事件
  if (dragIndex !== -1) { // 確認目前正在拖曳選項
    dragX = mouseX; // 更新拖曳中的 X 座標
    dragY = mouseY; // 更新拖曳中的 Y 座標
  } // 結束拖曳更新判斷
  return false; // 阻止瀏覽器執行預設拖曳行為
} // 結束滑鼠拖曳事件

function mouseReleased() { // 處理滑鼠放開事件
  finishDrag(mouseX, mouseY); // 將選項放置到作答區或取消本次拖曳
  return false; // 阻止瀏覽器執行預設滑鼠行為
} // 結束滑鼠放開事件

function touchStarted() { // 處理觸控開始事件
  const pointer = getTouchPointer(); // 取得第一個有效觸控點
  if (pointer === null) { // 確認目前是否沒有有效觸控點
    return false; // 沒有觸控點時直接結束事件
  } // 結束無觸控點判斷
  if (handleNavigationPress(pointer.x, pointer.y)) { // 優先處理觸控導覽按鈕
    return false; // 阻止瀏覽器執行預設觸控行為
  } // 結束觸控導覽按鈕判斷
  if (!submitted) { // 只有交卷前可以用觸控拖曳選項
    const pickedIndex = findChoiceAt(pointer.x, pointer.y); // 找出觸控起點對應的選項
    if (pickedIndex !== -1) { // 確認確實觸控到某個選項
      dragIndex = pickedIndex; // 設定目前被拖曳的選項索引
      dragX = pointer.x; // 記錄觸控起點 X 座標
      dragY = pointer.y; // 記錄觸控起點 Y 座標
    } // 結束觸控選項判斷
  } // 結束觸控交卷前判斷
  return false; // 阻止瀏覽器執行預設觸控行為
} // 結束觸控開始事件

function touchMoved() { // 處理觸控移動事件
  const pointer = getTouchPointer(); // 取得第一個有效觸控點
  if (pointer !== null && dragIndex !== -1) { // 確認有觸控點且正在拖曳
    dragX = pointer.x; // 更新觸控拖曳的 X 座標
    dragY = pointer.y; // 更新觸控拖曳的 Y 座標
  } // 結束觸控拖曳更新判斷
  return false; // 阻止瀏覽器執行頁面捲動
} // 結束觸控移動事件

function touchEnded() { // 處理觸控結束事件
  const pointer = getTouchPointer(); // 取得最後可用的觸控座標
  const releaseX = pointer === null ? dragX : pointer.x; // 決定觸控放開時的 X 座標
  const releaseY = pointer === null ? dragY : pointer.y; // 決定觸控放開時的 Y 座標
  finishDrag(releaseX, releaseY); // 將觸控選項放置到作答區或取消拖曳
  return false; // 阻止瀏覽器執行預設觸控行為
} // 結束觸控結束事件

function createQuestions() { // 建立六道 p5.js 基礎程式設計題
  return [ // 回傳完整的題目陣列
    { // 開始第一題資料
      prompt: `在 p5.js 中，哪一個函式通常用來設定畫布大小？`, // 設定第一題題目文字
      hint: `提示：它通常寫在 setup 函式裡。`, // 設定第一題提示文字
      options: [`createCanvas(600, 400)`, `drawCanvas(600, 400)`, `makeScreen(600, 400)`, `sizeCanvas(600, 400)`, `canvasSize(600, 400)`, `setCanvas(600, 400)`], // 設定第一題六個文字選項
      correct: 0 // 設定第一題正確答案索引
    }, // 結束第一題資料
    { // 開始第二題資料
      prompt: `p5.js 中的 draw 函式有什麼主要用途？`, // 設定第二題題目文字
      hint: `提示：它會在程式執行期間反覆被呼叫。`, // 設定第二題提示文字
      options: [`持續繪製與更新畫面`, `只讀取 HTML 標籤`, `關閉瀏覽器視窗`, `建立 JavaScript 檔案`, `下載外部圖片`, `刪除所有變數`], // 設定第二題六個文字選項
      correct: 0 // 設定第二題正確答案索引
    }, // 結束第二題資料
    { // 開始第三題資料
      prompt: `哪一個函式可以在 p5.js 中設定填滿圖形的顏色？`, // 設定第三題題目文字
      hint: `提示：它會影響後續圖形的內部顏色。`, // 設定第三題提示文字
      options: [`fill(255, 0, 0)`, `inside(255, 0, 0)`, `paintIn(255, 0, 0)`, `colorFillNow(255, 0, 0)`, `shapeColor(255, 0, 0)`, `solid(255, 0, 0)`], // 設定第三題六個文字選項
      correct: 0 // 設定第三題正確答案索引
    }, // 結束第三題資料
    { // 開始第四題資料
      prompt: `mouseX 和 mouseY 在 p5.js 中通常代表什麼？`, // 設定第四題題目文字
      hint: `提示：它們和滑鼠在畫布上的位置有關。`, // 設定第四題提示文字
      options: [`滑鼠在畫布上的座標`, `畫布的固定寬高`, `目前的音量數值`, `動畫播放秒數`, `瀏覽器的網址`, `使用者的密碼`], // 設定第四題六個文字選項
      correct: 0 // 設定第四題正確答案索引
    }, // 結束第四題資料
    { // 開始第五題資料
      prompt: `若要讓圓形持續旋轉，通常需要在 draw 中改變哪一種數值？`, // 設定第五題題目文字
      hint: `提示：旋轉角度通常是會隨時間改變的變數。`, // 設定第五題提示文字
      options: [`旋轉角度`, `檔案副檔名`, `HTML 語言名稱`, `鍵盤品牌`, `瀏覽器名稱`, `畫布標題文字`], // 設定第五題六個文字選項
      correct: 0 // 設定第五題正確答案索引
    }, // 結束第五題資料
    { // 開始第六題資料
      prompt: `哪一個函式可以在 p5.js 中畫出一條線？`, // 設定第六題題目文字
      hint: `提示：它需要四個座標參數來表示兩個端點。`, // 設定第六題提示文字
      options: [`line(20, 20, 120, 80)`, `drawLineText(20, 20)`, `strokePathOnly(20, 20)`, `makeLineNow(20, 20)`, `segmentCreate(20, 20)`, `connectWords(20, 20)`], // 設定第六題六個文字選項
      correct: 0 // 設定第六題正確答案索引
    } // 結束第六題資料
  ]; // 結束並回傳六道題目
} // 結束題目建立函式

function layoutCanvas() { // 計算全螢幕響應式版面
  const narrow = width < 620; // 判斷目前是否為窄螢幕
  const side = narrow ? 16 : 32; // 依螢幕寬度設定左右邊界
  const headerHeight = narrow ? 58 : 72; // 依螢幕寬度設定標題列高度
  const demoHeight = constrain(height * 0.245, narrow ? 145 : 175, narrow ? 205 : 270); // 設定動畫示範區高度
  const demoY = headerHeight + 8; // 設定動畫示範區起始位置
  const answerY = demoY + demoHeight + 12; // 設定作答區起始位置
  const answerHeight = narrow ? 72 : 82; // 設定作答區高度
  const questionY = answerY + answerHeight + 10; // 設定題目區起始位置
  const navHeight = narrow ? 58 : 64; // 設定導覽列預留高度
  const promptHeight = narrow ? 54 : 58; // 設定題目文字區高度
  const choiceTop = questionY + promptHeight; // 設定選項區起始位置
  const columns = narrow ? 2 : 3; // 窄螢幕兩欄、寬螢幕三欄
  const rows = Math.ceil(6 / columns); // 依欄數計算六個選項所需列數
  const gap = narrow ? 8 : 10; // 設定選項之間的間距
  const choiceWidth = (width - side * 2 - gap * (columns - 1)) / columns; // 計算每個選項寬度
  const availableChoiceHeight = height - choiceTop - navHeight - gap * (rows - 1) - 8; // 計算選項可用高度
  const choiceHeight = constrain(availableChoiceHeight / rows, narrow ? 32 : 38, narrow ? 50 : 56); // 計算每個選項高度
  layout = { side, headerHeight, demoY, demoHeight, answerY, answerHeight, questionY, promptHeight, choiceTop, columns, rows, gap, choiceWidth, choiceHeight, navHeight }; // 儲存所有版面數值
} // 結束響應式版面計算

function drawTopBar() { // 繪製標題列與測驗進度
  noStroke(); // 關閉標題列外框線
  fill("#0f1f35"); // 設定標題列背景色
  rect(0, 0, width, layout.headerHeight); // 繪製標題列背景
  fill("#e0f2fe"); // 設定主標題顏色
  textAlign(LEFT, CENTER); // 設定主標題靠左垂直置中
  textSize(width < 620 ? 19 : 26); // 依螢幕寬度設定主標題大小
  text(`p5.js 拖曳題測驗`, layout.side, layout.headerHeight * 0.45); // 繪製測驗主標題
  fill("#93c5fd"); // 設定進度文字顏色
  textAlign(RIGHT, CENTER); // 設定進度文字靠右垂直置中
  textSize(width < 620 ? 14 : 17); // 依螢幕寬度設定進度文字大小
  text(`第 ${currentQuestion + 1} / ${questions.length} 題`, width - layout.side, layout.headerHeight * 0.45); // 繪製目前題號
} // 結束標題列繪製

function drawAnimationDemo() { // 繪製內建 p5.js 動畫示範區
  const x = layout.side; // 取得示範區左側座標
  const y = layout.demoY; // 取得示範區上方座標
  const w = width - layout.side * 2; // 計算示範區寬度
  const h = layout.demoHeight; // 取得示範區高度
  noStroke(); // 關閉示範區外框線
  fill("#102a43"); // 設定示範區背景色
  rect(x, y, w, h, 18); // 繪製示範區圓角背景
  fill("#bae6fd"); // 設定示範區標籤顏色
  textAlign(LEFT, TOP); // 設定標籤靠左靠上對齊
  textSize(width < 620 ? 15 : 19); // 設定示範區標籤文字大小
  text(`p5.js 動畫示範`, x + 16, y + 13); // 繪製指定的動畫示範標示
  push(); // 保存目前繪圖狀態
  translate(x + w * 0.5, y + h * 0.58); // 將動畫座標原點移到示範區中央偏下
  const orbit = min(w, h) * 0.25; // 計算動畫軌道大小
  const pulse = 1 + sin(animationPhase * 2 + animationSeed) * 0.08; // 計算中心圖形的呼吸縮放
  noFill(); // 設定軌道不填色
  stroke("#38bdf8"); // 設定軌道線條顏色
  strokeWeight(2); // 設定軌道線條寬度
  ellipse(0, 0, orbit * 2, orbit * 0.82); // 繪製水平橢圓軌道
  ellipse(0, 0, orbit * 0.82, orbit * 2); // 繪製垂直橢圓軌道
  rotate(animationPhase * 0.7); // 讓整組軌道持續旋轉
  fill("#fbbf24"); // 設定環繞小球顏色
  noStroke(); // 關閉小球外框線
  ellipse(orbit, 0, 18, 18); // 繪製第一顆環繞小球
  ellipse(-orbit, 0, 14, 14); // 繪製第二顆環繞小球
  rotate(-animationPhase * 1.4); // 調整第二組動畫的旋轉角度
  fill("#fb7185"); // 設定中心圖形顏色
  ellipse(0, 0, 72 * pulse, 72 * pulse); // 繪製會呼吸的中心圓形
  fill("#082f49"); // 設定中心圖形文字顏色
  textAlign(CENTER, CENTER); // 設定中心文字置中
  textSize(14); // 設定中心文字大小
  text(`p5`, 0, 0); // 繪製 p5 文字
  pop(); // 還原繪圖狀態
} // 結束動畫示範繪製

function drawAnswerZone() { // 繪製動畫下方的作答區
  const x = layout.side; // 取得作答區左側座標
  const y = layout.answerY; // 取得作答區上方座標
  const w = width - layout.side * 2; // 計算作答區寬度
  const h = layout.answerHeight; // 取得作答區高度
  const hasAnswer = answers[currentQuestion] !== null; // 判斷目前題目是否已有答案
  const zoneColor = dragIndex !== -1 ? "#164e63" : "#102a43"; // 拖曳時用較亮的背景提示放置位置
  noStroke(); // 關閉作答區外框線
  fill(zoneColor); // 設定作答區背景色
  rect(x, y, w, h, 14); // 繪製作答區圓角背景
  noFill(); // 改用線框繪製作答區邊界
  stroke(dragIndex !== -1 ? "#67e8f9" : "#2563eb"); // 設定作答區邊界顏色
  strokeWeight(2); // 設定作答區邊界寬度
  rect(x + 1, y + 1, w - 2, h - 2, 14); // 繪製作答區邊界
  noStroke(); // 關閉後續文字外框線
  fill("#bae6fd"); // 設定作答區標題顏色
  textAlign(LEFT, CENTER); // 設定作答區標題靠左置中
  textSize(width < 620 ? 14 : 17); // 設定作答區標題文字大小
  text(`作答區`, x + 14, y + h * 0.32); // 繪製作答區標題
  fill(hasAnswer ? "#fef3c7" : "#93c5fd"); // 依是否有答案設定說明顏色
  textSize(width < 620 ? 13 : 16); // 設定作答區說明文字大小
  const answerText = hasAnswer ? questions[currentQuestion].options[answers[currentQuestion]] : `請把下方選項拖曳到這裡`; // 決定作答區顯示文字
  text(answerText, x + 14, y + h * 0.7); // 繪製作答區答案或提示
} // 結束作答區繪製

function drawQuestionPanel() { // 繪製目前題目、提示與六個選項
  const question = questions[currentQuestion]; // 取得目前題目資料
  const x = layout.side; // 取得題目區左側座標
  const y = layout.questionY; // 取得題目區上方座標
  fill("#f8fafc"); // 設定題目文字顏色
  textAlign(LEFT, TOP); // 設定題目靠左靠上對齊
  textSize(width < 620 ? 15 : 18); // 設定題目文字大小
  text(question.prompt, x, y); // 繪製目前題目文字
  fill("#94a3b8"); // 設定提示文字顏色
  textSize(width < 620 ? 12 : 14); // 設定提示文字大小
  text(question.hint, x, y + 27); // 繪製目前題目提示
  for (let index = 0; index < question.options.length; index += 1) { // 逐一繪製目前題目的六個選項
    drawChoice(index); // 繪製指定索引的文字選項
  } // 結束六個選項繪製迴圈
} // 結束題目與選項繪製

function drawChoice(index) { // 繪製單一可拖曳文字選項
  const rectangle = getChoiceRect(index); // 取得選項的響應式矩形位置
  const selected = answers[currentQuestion] === index; // 判斷選項是否為目前已選答案
  const dragging = dragIndex === index; // 判斷選項是否正在被拖曳
  noStroke(); // 關閉選項外框線
  fill(dragging ? "#0e7490" : selected ? "#854d0e" : "#172b46"); // 依狀態設定選項背景色
  rect(rectangle.x, rectangle.y, rectangle.w, rectangle.h, 10); // 繪製選項圓角背景
  noFill(); // 改用線框繪製選項邊界
  stroke(dragging ? "#a5f3fc" : selected ? "#facc15" : "#315477"); // 依狀態設定選項邊界色
  strokeWeight(selected ? 2.5 : 1.5); // 依狀態設定選項邊界寬度
  rect(rectangle.x, rectangle.y, rectangle.w, rectangle.h, 10); // 繪製選項邊界
  noStroke(); // 關閉文字外框線
  fill(selected ? "#fef08a" : "#dbeafe"); // 依選取狀態設定選項文字顏色
  textAlign(LEFT, CENTER); // 設定選項文字靠左置中
  textSize(width < 620 ? 12 : 15); // 設定選項文字大小
  text(`${String.fromCharCode(65 + index)}. ${questions[currentQuestion].options[index]}`, rectangle.x + 10, rectangle.y + rectangle.h * 0.5); // 繪製選項文字
} // 結束單一選項繪製

function drawNavigation() { // 繪製測驗狀態訊息與導覽按鈕
  const buttonY = height - layout.navHeight + 10; // 計算導覽按鈕上方座標
  const buttonH = layout.navHeight - 18; // 計算導覽按鈕高度
  const buttonGap = width < 620 ? 7 : 12; // 設定按鈕間距
  const restartW = width < 620 ? 86 : 108; // 設定重新測驗按鈕寬度
  const normalW = width < 620 ? 88 : 112; // 設定一般導覽按鈕寬度
  const viewW = width < 620 ? 116 : 150; // 設定查看成績按鈕寬度
  fill("#94a3b8"); // 設定底部狀態文字顏色
  textAlign(LEFT, CENTER); // 設定底部狀態文字靠左置中
  textSize(width < 620 ? 12 : 14); // 設定底部狀態文字大小
  if (submitted && !scoreVisible) { // 判斷是否為已交卷但尚未查看成績
    text(`已交卷，請按查看成績`, layout.side, buttonY - 12); // 顯示不可立即出分的提示
  } else if (scoreVisible) { // 判斷是否已經顯示成績
    text(`測驗完成，歡迎重新挑戰`, layout.side, buttonY - 12); // 顯示完成後的提示
  } else { // 處理一般作答狀態
    text(`拖曳選項作答，可留白不作答`, layout.side, buttonY - 12); // 顯示作答操作提示
  } // 結束底部狀態文字判斷
  const restartX = width - layout.side - restartW; // 計算重新測驗按鈕 X 座標
  drawButton(restartX, buttonY, restartW, buttonH, `重新測驗`, "#334155"); // 繪製重新測驗按鈕
  if (submitted && !scoreVisible) { // 判斷是否要顯示查看成績按鈕
    const viewX = restartX - buttonGap - viewW; // 計算查看成績按鈕 X 座標
    drawButton(viewX, buttonY, viewW, buttonH, `查看成績`, "#0e7490"); // 繪製查看成績按鈕
  } else if (!submitted) { // 判斷是否仍在作答中
    const actionW = width < 620 ? 88 : 112; // 設定上一題或下一題按鈕寬度
    const actionX = restartX - buttonGap - actionW; // 計算動作按鈕 X 座標
    const actionLabel = currentQuestion === questions.length - 1 ? `交卷` : `下一題`; // 決定右側動作按鈕文字
    drawButton(actionX, buttonY, actionW, buttonH, actionLabel, "#2563eb"); // 繪製下一題或交卷按鈕
    if (currentQuestion > 0) { // 判斷是否可以返回上一題
      const previousX = actionX - buttonGap - actionW; // 計算上一題按鈕 X 座標
      drawButton(previousX, buttonY, actionW, buttonH, `上一題`, "#475569"); // 繪製上一題按鈕
    } // 結束上一題按鈕判斷
  } // 結束狀態按鈕判斷
  if (scoreVisible) { // 判斷是否要在畫面上顯示成績卡片
    drawScoreCard(); // 繪製總分與百分比但不提前顯示
  } // 結束成績卡片判斷
} // 結束導覽按鈕繪製

function drawButton(x, y, w, h, label, colorValue) { // 繪製可點擊的圓角按鈕
  noStroke(); // 關閉按鈕外框線
  fill(colorValue); // 設定按鈕背景色
  rect(x, y, w, h, 9); // 繪製按鈕圓角背景
  fill("#f8fafc"); // 設定按鈕文字顏色
  textAlign(CENTER, CENTER); // 設定按鈕文字置中
  textSize(width < 620 ? 12 : 15); // 設定按鈕文字大小
  text(label, x + w * 0.5, y + h * 0.5); // 繪製按鈕文字
} // 結束按鈕繪製

function drawScoreCard() { // 繪製查看成績後的總分卡片
  const cardW = width < 620 ? width - layout.side * 2 : 330; // 計算成績卡片寬度
  const cardH = width < 620 ? 68 : 76; // 計算成績卡片高度
  const cardX = width < 620 ? layout.side : width - layout.side - cardW; // 計算成績卡片 X 座標
  const cardY = layout.answerY; // 將成績卡片放在作答區位置
  noStroke(); // 關閉成績卡片外框線
  fill("#14532d"); // 設定成績卡片背景色
  rect(cardX, cardY, cardW, cardH, 14); // 繪製成績卡片背景
  fill("#dcfce7"); // 設定成績文字顏色
  textAlign(CENTER, CENTER); // 設定成績文字置中
  textSize(width < 620 ? 16 : 20); // 設定成績文字大小
  text(`總分 ${scoreCount} / ${questions.length} 題，${scorePercent}%`, cardX + cardW * 0.5, cardY + cardH * 0.5); // 繪製總分與百分比
} // 結束成績卡片繪製

function drawDraggedChoice() { // 繪製跟隨游標或手指的拖曳選項
  if (dragIndex < 0 || dragIndex >= questions[currentQuestion].options.length) { // 確認拖曳索引有效
    return; // 索引無效時不繪製拖曳項目
  } // 結束拖曳索引判斷
  const dragW = min(width < 620 ? 220 : 300, width - 24); // 設定拖曳項目的寬度
  const dragH = 42; // 設定拖曳項目的高度
  const dragLeft = constrain(dragX - dragW * 0.5, 12, width - dragW - 12); // 計算拖曳項目左側位置
  const dragTop = constrain(dragY - dragH * 0.5, 8, height - dragH - 8); // 計算拖曳項目上方位置
  noStroke(); // 關閉拖曳項目外框線
  fill("#0e7490"); // 設定拖曳項目背景色
  rect(dragLeft, dragTop, dragW, dragH, 10); // 繪製拖曳項目背景
  fill("#ecfeff"); // 設定拖曳項目文字顏色
  textAlign(CENTER, CENTER); // 設定拖曳項目文字置中
  textSize(width < 620 ? 12 : 15); // 設定拖曳項目文字大小
  text(questions[currentQuestion].options[dragIndex], dragLeft + dragW * 0.5, dragTop + dragH * 0.5); // 繪製被拖曳的選項文字
} // 結束拖曳選項繪製

function getChoiceRect(index) { // 計算指定選項的響應式矩形
  const column = index % layout.columns; // 計算選項所在欄位
  const row = floor(index / layout.columns); // 計算選項所在列位
  return { // 回傳選項矩形資料
    x: layout.side + column * (layout.choiceWidth + layout.gap), // 計算選項左側座標
    y: layout.choiceTop + row * (layout.choiceHeight + layout.gap), // 計算選項上方座標
    w: layout.choiceWidth, // 回傳選項寬度
    h: layout.choiceHeight // 回傳選項高度
  }; // 結束選項矩形資料
} // 結束選項矩形計算

function findChoiceAt(pointerX, pointerY) { // 找出座標所在的選項索引
  for (let index = 0; index < 6; index += 1) { // 逐一檢查六個選項
    const rectangle = getChoiceRect(index); // 取得目前選項矩形
    if (pointerX >= rectangle.x && pointerX <= rectangle.x + rectangle.w && pointerY >= rectangle.y && pointerY <= rectangle.y + rectangle.h) { // 判斷座標是否落在選項內
      return index; // 回傳被按下的選項索引
    } // 結束目前選項命中判斷
  } // 結束六個選項檢查迴圈
  return -1; // 找不到選項時回傳無效索引
} // 結束選項命中判斷

function isInsideAnswerZone(pointerX, pointerY) { // 判斷座標是否位於作答區
  return pointerX >= layout.side && pointerX <= width - layout.side && pointerY >= layout.answerY && pointerY <= layout.answerY + layout.answerHeight; // 回傳作答區命中結果
} // 結束作答區命中判斷

function finishDrag(releaseX, releaseY) { // 完成滑鼠或觸控拖曳流程
  if (dragIndex === -1) { // 確認目前是否沒有拖曳中的選項
    return; // 沒有拖曳時不進行任何處理
  } // 結束無拖曳判斷
  if (!submitted && isInsideAnswerZone(releaseX, releaseY)) { // 判斷是否在交卷前放入作答區
    answers[currentQuestion] = dragIndex; // 將被拖曳的選項寫入目前題目答案
  } // 結束作答區放置判斷
  dragIndex = -1; // 清除拖曳狀態
} // 結束拖曳流程

function handleNavigationPress(pointerX, pointerY) { // 處理所有導覽按鈕按下動作
  const buttonY = height - layout.navHeight + 10; // 計算導覽按鈕上方座標
  const buttonH = layout.navHeight - 18; // 計算導覽按鈕高度
  const buttonGap = width < 620 ? 7 : 12; // 設定按鈕間距
  const restartW = width < 620 ? 86 : 108; // 設定重新測驗按鈕寬度
  const normalW = width < 620 ? 88 : 112; // 設定一般按鈕寬度
  const viewW = width < 620 ? 116 : 150; // 設定查看成績按鈕寬度
  const restartX = width - layout.side - restartW; // 計算重新測驗按鈕 X 座標
  if (insideRectangle(pointerX, pointerY, restartX, buttonY, restartW, buttonH)) { // 判斷是否按下重新測驗
    resetQuiz(); // 執行重新測驗流程
    return true; // 回報已處理按鈕事件
  } // 結束重新測驗按鈕判斷
  if (submitted && !scoreVisible) { // 判斷目前是否可查看成績
    const viewX = restartX - buttonGap - viewW; // 計算查看成績按鈕 X 座標
    if (insideRectangle(pointerX, pointerY, viewX, buttonY, viewW, buttonH)) { // 判斷是否按下查看成績
      revealScore(); // 顯示總分與百分比
      return true; // 回報已處理按鈕事件
    } // 結束查看成績按鈕判斷
  } // 結束查看成績狀態判斷
  if (!submitted) { // 判斷目前是否仍可操作題目導覽
    const actionW = normalW; // 設定右側動作按鈕寬度
    const actionX = restartX - buttonGap - actionW; // 計算下一題或交卷按鈕 X 座標
    if (insideRectangle(pointerX, pointerY, actionX, buttonY, actionW, buttonH)) { // 判斷是否按下下一題或交卷
      if (currentQuestion === questions.length - 1) { // 判斷目前是否為最後一題
        submitQuiz(); // 執行交卷流程
      } else { // 處理尚未到最後一題的狀態
        currentQuestion += 1; // 前往下一題
      } // 結束下一題或交卷判斷
      return true; // 回報已處理按鈕事件
    } // 結束右側動作按鈕判斷
    if (currentQuestion > 0) { // 判斷目前是否可以使用上一題
      const previousX = actionX - buttonGap - actionW; // 計算上一題按鈕 X 座標
      if (insideRectangle(pointerX, pointerY, previousX, buttonY, actionW, buttonH)) { // 判斷是否按下上一題
        currentQuestion -= 1; // 返回上一題
        return true; // 回報已處理按鈕事件
      } // 結束上一題按鈕判斷
    } // 結束上一題可用判斷
  } // 結束作答中導覽判斷
  return false; // 回報這次按下沒有命中導覽按鈕
} // 結束導覽按鈕事件處理

function insideRectangle(pointerX, pointerY, x, y, w, h) { // 判斷座標是否在指定矩形內
  return pointerX >= x && pointerX <= x + w && pointerY >= y && pointerY <= y + h; // 回傳矩形命中結果
} // 結束矩形命中判斷

function submitQuiz() { // 執行最後一題交卷流程
  submitted = true; // 設定為已交卷狀態
  scoreVisible = false; // 確保交卷當下不顯示成績
  scoreCount = 0; // 清除尚未計算的答對題數
  scorePercent = 0; // 清除尚未顯示的百分比
} // 結束交卷流程

function revealScore() { // 執行查看成績流程
  scoreCount = 0; // 將答對題數歸零後重新計算
  for (let index = 0; index < questions.length; index += 1) { // 逐題計算答案是否正確
    if (answers[index] === questions[index].correct) { // 判斷目前答案是否符合唯一正確索引
      scoreCount += 1; // 增加答對題數
    } // 結束單題正確判斷
  } // 結束逐題計算迴圈
  scorePercent = Math.round(scoreCount / questions.length * 100); // 計算並四捨五入百分比
  scoreVisible = true; // 顯示總分與百分比
  if (scorePercent > 60) { // 只有嚴格大於百分之六十才建立彩帶
    createConfetti(); // 建立新的彩帶動畫
  } // 結束彩帶建立條件
} // 結束查看成績流程

function resetQuiz() { // 執行重新測驗流程
  currentQuestion = 0; // 回到第一題
  answers = new Array(questions.length).fill(null); // 清除所有題目的答案
  submitted = false; // 清除已交卷狀態
  scoreVisible = false; // 隱藏成績卡片
  scorePercent = 0; // 清除百分比
  scoreCount = 0; // 清除答對題數
  dragIndex = -1; // 清除拖曳狀態
  confettiPieces = []; // 清除畫面上的彩帶
} // 結束重新測驗流程

function getTouchPointer() { // 取得目前第一個觸控點
  if (touches && touches.length > 0) { // 判斷 p5.js 是否提供有效觸控陣列
    return { x: touches[0].x, y: touches[0].y }; // 回傳第一個觸控點座標
  } // 結束有效觸控陣列判斷
  if (typeof mouseX === "number" && typeof mouseY === "number") { // 在觸控結束後使用最後滑鼠座標作為備援
    return { x: mouseX, y: mouseY }; // 回傳備援座標
  } // 結束備援座標判斷
  return null; // 沒有可用座標時回傳空值
} // 結束觸控座標取得

function createConfetti() { // 建立成績達標時的彩帶資料
  confettiPieces = []; // 先清除舊的彩帶資料
  for (let index = 0; index < 90; index += 1) { // 建立九十個彩帶粒子
    confettiPieces.push({ // 將單一彩帶加入陣列
      x: random(width), // 設定彩帶初始 X 座標
      y: random(-height, 0), // 設定彩帶從畫面上方落下
      size: random(5, 11), // 設定彩帶尺寸
      speed: random(1.5, 4.5), // 設定彩帶下降速度
      angle: random(TWO_PI), // 設定彩帶初始旋轉角度
      spin: random(-0.08, 0.08), // 設定彩帶旋轉速度
      drift: random(-0.8, 0.8), // 設定彩帶水平飄移速度
      color: random(["#f43f5e", "#facc15", "#22c55e", "#38bdf8", "#c084fc"]) // 設定彩帶顏色
    }); // 結束單一彩帶資料
  } // 結束九十個彩帶建立迴圈
} // 結束彩帶資料建立

function drawConfetti() { // 更新並繪製達標彩帶動畫
  for (const piece of confettiPieces) { // 逐一處理每個彩帶粒子
    piece.y += piece.speed; // 更新彩帶垂直位置
    piece.x += piece.drift + sin(animationPhase + piece.y * 0.01) * 0.4; // 更新彩帶水平飄移位置
    piece.angle += piece.spin; // 更新彩帶旋轉角度
    if (piece.y > height + 20) { // 判斷彩帶是否已落出畫面
      piece.y = random(-80, -10); // 將落下的彩帶重新放回上方
      piece.x = random(width); // 為重新出現的彩帶設定新的水平位置
    } // 結束彩帶重置判斷
    push(); // 保存彩帶繪圖狀態
    translate(piece.x, piece.y); // 移動到彩帶目前位置
    rotate(piece.angle); // 旋轉目前彩帶
    noStroke(); // 關閉彩帶外框線
    fill(piece.color); // 設定目前彩帶顏色
    rect(0, 0, piece.size, piece.size * 1.8, 2); // 繪製矩形彩帶
    pop(); // 還原彩帶繪圖狀態
  } // 結束彩帶逐一繪製
} // 結束彩帶動畫繪製
