/**
 * Remember, you have access these globals:
 * 1. df - Just like the df object in your console.
 * 2. ui - For interacting with the game's user interface.
 *
 * Let's log these to the console when you run your plugin!
 */
console.log(df, ui);

import {
  html,
  render,
  //@ts-ignore
} from 'https://unpkg.com/htm/preact/standalone.module.js';
//@ts-ignore

class PluginTemplate implements DFPlugin {
  constructor() {}

  /**
   * Called when plugin is launched with the "run" button.
   */
  async render(container: HTMLDivElement) {

    render(
        html`14423`,
        container
    );
  }

  /**
   * Called when plugin modal is closed.
   */
  destroy() {}
}

/**
 * And don't forget to export it!
 */
export default PluginTemplate;
