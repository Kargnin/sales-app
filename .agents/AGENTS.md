After any code changes
1. Make sure there are no typescript compilation and erros
2. Make sure the server + client code builds and run without any issues.
3. FIrst phase alaways build backend(server) side changes, add server side tests and make sure all edge cases ar covered and APIs work as intended then move to front end
4. For front end keeo things modular, resue components, even new ones create them as separate reusable components to be resued later by other componenets as well. If required do an initial audit to identify similar components used elsewhere and if required refactor existing components to be reusable and resue them at existing and new code.

Awlays first check best way to structure a role based Ui component when a component is used/renders in multiple roles.

Search the web for best practices for both server as well as client side.

Always think about the structure/low level design of a compoenent first, extract out common rendering compoenent out, just pass the input datab for the component to render, keep the buiness logic separate from UI.

We should be able to change UI compoenents easliy without affecting the application.

Strictly use ionic, we use react router v7 with ionic for rendering native components.

Use ionic related skills whenever possible.

For UI design use stitch MCP to fetch app page design

stitch project id -> 2048573934882273867

DO NOT create custom style sheets, we are using NatievWind V5 + React Native Reusables to create custom brand ui components and Ui them in app, we have already defined a stylesheet here just use NativeWind class names for styling no custom styles sheet(client/tailwind.config.ts), no hex codes everywhere.