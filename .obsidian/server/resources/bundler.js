function getValue(key) {
  return localStorage.getItem(key);
}

function next() {
  const nextto = getValue("next_to");
  if (!nextto) {
    return false;
  } else {
    window.location.href = nextto;
    localStorage.removeItem("next_to");
    return true;
  }
}
