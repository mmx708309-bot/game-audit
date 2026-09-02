// أسلوب «مسرح الاختيارات»: لعبة كاملة الشاشة؛ React إطار للمشهد وBabylon هو طبقة الكواليس المتحركة.
import ErrorBoundary from "./components/ErrorBoundary";
import GameCanvas from "./components/GameCanvas";

function App() {
  return <ErrorBoundary><GameCanvas /></ErrorBoundary>;
}

export default App;
