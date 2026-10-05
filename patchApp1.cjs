const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const stateCode = `
  const [liveImpactEvents, setLiveImpactEvents] = useState<any[]>([]);
  const [isImpactLoading, setIsImpactLoading] = useState(false);

  useEffect(() => {
    const fetchLiveImpact = async () => {
      setIsImpactLoading(true);
      try {
        const res = await fetch("/api/impact-events/live");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.events) {
            setLiveImpactEvents(data.events);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live impact events", err);
      } finally {
        setIsImpactLoading(false);
      }
    };
    fetchLiveImpact();
  }, []);
`;

code = code.replace('const [weatherData, setWeatherData] = useState<any>(null);', 'const [weatherData, setWeatherData] = useState<any>(null);' + stateCode);
fs.writeFileSync('src/App.tsx', code);
