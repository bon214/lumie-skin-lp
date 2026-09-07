# 全面表示用ヒーロー画像

- 出力: `images/lumie-fullscreen-hero-v1.png`
- 用途: PC向けの横長・全面表示用トップ写真。左側にHTMLのコピー、右側に商品を配置する想定。
- 手段: 内蔵画像生成ツール（image_gen）。既存の商品写真を商品形状・色・ラベルの参照に使用。
- 状態: サイトへ実装。配信用にJPEGへ変換し、PNGの生成原本はローカルで保持。
- 確認: ボトルとスポイト全体、ブランド名・商品名、左側の文字用余白を目視確認。
- モバイル: 同じ画像を下部に配置し、上部のコピーと分離。写真上端は背景色になじませ、ボトル全体を表示する。

## 最終生成プロンプト

Use case: product-mockup.
Asset type: a photorealistic, full-bleed desktop website hero photograph for the existing fictional Japanese skincare brand LUMIE SKIN. Create one finished landscape photograph in a wide 16:9 composition, ideally 2560 x 1440 or equivalent high resolution.
Input image 1 is the PRODUCT IDENTITY REFERENCE: preserve the distinctive cylindrical frosted ivory glass bottle, thick transparent glass base, softly rounded shoulders, satin muted rose-gold cylindrical screw collar, single off-white rubber dropper bulb, and the refined brown label typography. Recompose the scene completely for a wide website hero. This is not a screenshot or a designed webpage.
Scene/backdrop: a quiet, authentic still-life in a warm off-white plaster interior, on a pale natural limestone surface, with a small softly folded piece of unbleached linen only in the lower right edge. A broad wash of soft morning window light comes from the left, with diffuse believable contact shadows falling toward the right. Premium editorial beauty photography, understated Japanese skincare advertising, tactile glass, softly lustrous metal, subtle irregular plaster, realistic optics and perspective.
Composition: entire single bottle stands upright at approximately 74 percent of frame width. Bottle top near 24 percent of frame height, bottle base near 86 percent, so the complete bottle takes about 62 percent of image height. Keep the product large enough to recognize but not a macro crop. Bottle front label faces camera clearly. Maintain a generous clean margin around the bottle and dropper. The LEFT 50 to 55 percent of the frame must be very calm, light ivory negative space with only a faint natural wall texture, suitable for dark brown HTML headline and CTA overlay later. Do not place strong shadows, fabrics, objects, seams, or bright flares behind this future left-side copy zone. The upper 12 percent must be calm for a transparent navigation bar. Make the wall-to-table transition soft and unobtrusive near the lower fifth of the frame, avoiding a distracting hard line.
Lighting/mood: quiet, breathable, tender early morning daylight, believable photographic texture and moderate contrast. Warm ivory #F7F3EE, cream, pale stone, restrained blush rose metal. Avoid overexposure; retain bottle edges and readable label.
Text only ON the bottle, verbatim, laid out as in the reference: "LUMIE SKIN", a small separator line, "Calm Veil" on one line, "Serum" below, "30mL" near the bottom. Correct spelling LUMIE, not LUMINE. No text anywhere else.
Constraints: one intact product bottle only, no duplicate products, no open pipette, no detached droplet, no hands or people, no flowers or foliage, no extra cosmetics, no screens, no watermarks, no interface, no rendered headline/buttons, no gradients that look like graphic overlays, no exaggerated plastic CGI surfaces, no distorted label or dropper. Preserve product identity and elegant restrained brand concept.
