import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";
import Index from "./pages/index";
import SignIn from "./pages/sign-in";
import Setup from "./pages/setup";
import Dashboard from "./pages/dashboard";
import Leads from "./pages/leads";
import Workflow from "./pages/workflow";
import EmailAutomation from "./pages/email-automation";
import Users from "./pages/users";
import Import from "./pages/import";
import ResetPassword from "./pages/reset-password";
import ActivityLog from "./pages/activity-log";
import Media from "./pages/media";
import EmailCampaign from "./pages/email-campaign";
import Signups from "./pages/signups";
import Subscriptions from "./pages/subscriptions";
import EmailLog from "./pages/email-log";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/setup" component={Setup} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/leads" component={Leads} />
        <Route path="/import" component={Import} />
        <Route path="/workflow" component={Workflow} />
        <Route path="/email-automation" component={EmailAutomation} />
        <Route path="/users" component={Users} />
        <Route path="/activity-log" component={ActivityLog} />
        <Route path="/media" component={Media} />
        <Route path="/email-campaign" component={EmailCampaign} />
        <Route path="/signups" component={Signups} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/email-log" component={EmailLog} />
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
