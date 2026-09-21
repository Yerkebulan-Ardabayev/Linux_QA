import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";

// Страница одна, экран выбирается по #-адресу внутри Index, поэтому роутер не нужен:
// одинаково работает и на GitHub Pages, и в офлайн-файле по file://.
const App = () => (
  // storageKey совпадает с ключом в инлайн-скрипте index.html, который ставит
  // класс темы до первой отрисовки. Разъедутся, вернётся мигание при загрузке.
  <ThemeProvider attribute="class" defaultTheme="system" storageKey="theme" enableSystem disableTransitionOnChange>
    <Index />
  </ThemeProvider>
);

export default App;
