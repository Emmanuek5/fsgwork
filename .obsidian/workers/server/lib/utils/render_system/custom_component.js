class CustomComponent {
  constructor(parent, name, styles, ...args) {
    this.name = name;
    this.parent = parent;
    this.element = {};
    this.element_string = "";
    this.args = args;
    this.styles = styles;
  }

  getHtml() {
    this.element = {
      name: this.name,
      args: this.args,
      parent: this.parent,
      styles: this.styles,
    };
    //lets assume the args are in  json
    let args_string = () => {
      let args_string = "";
      //lets change them into arg="value"
      for (let i = 0; i < this.element.args.length; i++) {
        args_string += `${this.element.args[i]} `;
      }
      return args_string;
    };
    this.element_string = `
      <${this.name} class="${this.parent}.${this.name}" ${args_string()}>
      </${this.name}>
    `;
  }
}

module.exports = CustomComponent;
