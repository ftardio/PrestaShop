const BOBasePage = require('../BO/BObasePage');

module.exports = class AddProduct extends BOBasePage {
  constructor(page) {
    super(page);

    // Text Message
    this.settingUpdatedMessage = 'Settings updated.';
    // Selectors
    this.productNameInput = '#form_step1_name_1';
    this.productTypeSelect = '#form_step1_type_product';
    this.productWithCombinationsInput = '#show_variations_selector div:nth-of-type(2) input';
    this.productReferenceInput = '#form_step6_reference';
    this.productQuantityInput = '#form_step1_qty_0_shortcut';
    this.productPriceTtcInput = '#form_step1_price_ttc_shortcut';
    this.productPriceHtInput = '#form_step1_price_shortcut';
    this.saveProductButton = 'input#submit[value=\'Save\']';
    this.previewProductLink = 'a#product_form_preview_btn';
    this.productOnlineSwitch = '.product-footer div.switch-input';
    this.productDescriotionTab = '#tab_description a';
    this.productDescriptionIframe = '#form_step1_description_1_ifr';
    this.productDeleteLink = '.product-footer a.delete';

    // Form nav
    this.formNavList = '#form-nav';
    this.forNavlistItemLink = `${this.formNavList} #tab_step%ID a`;

    // Selector of Step 3 : Combinations
    this.AddCombinationsInput = '#form_step3_attributes-tokenfield';
    this.generateCombinationsButton = '#create-combinations';
    this.productCombinationBulkQuantityInput = '#product_combination_bulk_quantity';
    this.productCombinationSelectAllCheckbox = 'input#toggle-all-combinations';
    this.applyOnCombinationsButton = '#apply-on-combinations';
    this.productCombinationTableRow = '#accordion_combinations tr:nth-of-type(%ID)';
    this.deleteCombinationsButton = '#delete-combinations';
    this.productCombinationsBulkForm = '#combinations-bulk-form';
    this.productCombinationsBulkFormTitle = `${this.productCombinationsBulkForm} p[aria-controls]`;

    // Growls : override value from BObasePage
    this.growlMessageBloc = '#growls-default .growl-message';
  }

  /*
  Methods
   */
  /**
   * Create or edit product in BO
   * @param productData
   * @param switchProductOnline
   * @return {Promise<textContent>}
   */
  async createEditProduct(productData, switchProductOnline = true) {
    // Set Name, type of product, Reference, price ttc and quantity, and with combinations
    await this.page.click(this.productNameInput, {clickCount: 3});
    await this.page.type(this.productNameInput, productData.name);
    await this.selectByVisibleText(this.productTypeSelect, productData.type);
    await this.page.click(this.productReferenceInput, {clickCount: 3});
    await this.page.type(this.productReferenceInput, productData.reference);
    await this.page.click(this.productPriceTtcInput, {clickCount: 3});
    await this.page.type(this.productPriceTtcInput, productData.price);
    // Set description value
    await this.page.click(this.productDescriotionTab);
    await this.setValueOnTinymceInput(this.productDescriptionIframe, productData.description);
    // Add combinations if exists
    if (productData.withCombination) {
      await this.page.click(this.productWithCombinationsInput);
      await this.setCombinationsInProduct(productData);
    } else {
      await this.page.click(this.productQuantityInput, {clickCount: 3});
      await this.page.type(this.productQuantityInput, productData.quantity);
    }
    // Switch product online before save
    if (switchProductOnline) {
      await Promise.all([
        this.page.waitForSelector(this.growlMessageBloc, {visible: true}),
        this.page.click(this.productOnlineSwitch),
      ]);
    }
    // Save created product
    await Promise.all([
      this.page.waitForSelector(this.growlMessageBloc, {visible: true}),
      this.page.click(this.saveProductButton),
    ]);
    return this.getTextContent(this.growlMessageBloc);
  }

  /**
   * Set Combinations for product
   * @param productData
   * @return {Promise<void>}
   */
  async setCombinationsInProduct(productData) {
    // GOTO Combination tab : id = 3
    await this.goToFormStep(3);
    // Delete All combinations if exists
    await this.deleteAllCombinations();
    // set Combinations
    const keys = Object.keys(productData.combinations);
    /*eslint-disable*/
    for (const key of keys) {
      for (const value of productData.combinations[key]) {
        await this.page.type(this.AddCombinationsInput, `${key} : ${value}`);
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
      }
    }
    /* eslint-enable */
    await Promise.all([
      this.page.waitForSelector(this.productCombinationTableRow.replace('%ID', '1'), {visible: true}),
      this.page.click(this.generateCombinationsButton),
    ]);
    // Set Quantity in Combination
    await Promise.all([
      this.page.waitForSelector(`${this.productCombinationsBulkFormTitle}[aria-expanded='true']`, {visible: true}),
      this.page.click(this.productCombinationSelectAllCheckbox),
    ]);
    await this.page.type(this.productCombinationBulkQuantityInput, productData.quantity);
    await this.scrollTo(this.applyOnCombinationsButton);
    await this.page.click(this.applyOnCombinationsButton);
    await this.page.waitForSelector(`${this.productCombinationsBulkFormTitle}[aria-expanded='false']`, {visible: true});
    await this.page.waitFor(10000);
    // GOTO Basic settings Tab : id = 1
    await this.goToFormStep(1);
  }

  /**
   * Preview product in new tab
   * @return page opened
   */
  async previewProduct() {
    return this.openLinkWithTargetBlank(this.page, this.previewProductLink);
  }

  /**
   * Delete product
   * @return {Promise<textContent>}
   */
  async deleteProduct() {
    await Promise.all([
      this.page.waitForSelector(this.modalDialog, {visible: true}),
      this.page.click(this.productDeleteLink),
    ]);
    await Promise.all([
      this.page.waitForNavigation({waitUntil: 'networkidle0'}),
      this.page.waitForSelector(this.alertSuccessBlockParagraph, {visible: true}),
      this.page.click(this.modalDialogYesButton),
    ]);
    return this.getTextContent(this.alertSuccessBlockParagraph);
  }

  /**
   * Navigate beetween forms in add product
   * @param id
   * @return {Promise<void>}
   */
  async goToFormStep(id = '1') {
    const selector = this.forNavlistItemLink.replace('%ID', id);
    await Promise.all([
      this.page.waitForSelector(`${selector}[aria-selected='true']`, {visible: true}),
      this.page.click(selector),
    ]);
  }

  /**
   * Delete all combinations
   * @return {Promise<void>}
   */
  async deleteAllCombinations() {
    if (await this.elementVisible(this.productCombinationTableRow.replace('%ID', '1'), 2000)) {
      await Promise.all([
        this.page.waitForSelector(this.deleteCombinationsButton, {visible: true}),
        this.page.click(this.productCombinationSelectAllCheckbox),
      ]);
      await this.scrollTo(this.deleteCombinationsButton);
      await Promise.all([
        this.page.waitForSelector(this.modalDialog, {visible: true}),
        this.page.click(this.deleteCombinationsButton),
      ]);
      await this.page.waitFor(250);
      await Promise.all([
        this.page.waitForSelector(this.growlMessageBloc, {visible: true}),
        this.page.click(this.modalDialogYesButton),
      ]);
      // unSelect checkbox
      await this.page.click(this.productCombinationSelectAllCheckbox);
      await Promise.all([
        this.page.waitForSelector(`${this.productCombinationsBulkFormTitle}[aria-expanded='false']`, {visible: true}),
        this.page.click(`${this.productCombinationsBulkFormTitle}[aria-expanded='true']`),
      ]);
    }
  }
};
