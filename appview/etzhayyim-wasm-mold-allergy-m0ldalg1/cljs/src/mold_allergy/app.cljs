(ns mold-allergy.app
  "com-etzhayyim-app-mold-allergy appview — reagent + re-frame, view built
  from jp-go-dds (デジタル庁デザインシステム) hiccup.

  Faithful port of the previous SvelteKit scaffold's status page
  (`svelte/src/routes/+page.svelte`, 84 lines): a static display of this
  Worker's own declared surface — title / project / name / kind / route
  count + list, wrangler var keys, an XRPC-enabled flag, and its own
  source path. Every field below mirrors the constant `app` object
  `+page.svelte` held in its <script> block; nothing here is invented
  and nothing is simplified away.

  Two fields are honestly UPDATED, not copied, to stay truthful about
  what this migration itself changed:

  - `:app/relative-path` now names this file
    (`appview/etzhayyim-wasm-mold-allergy-m0ldalg1/cljs/src/mold_allergy/app.cljs`),
    not the deleted Svelte one.
  - `:app/xrpc?` is now false. This migration's wrangler.jsonc drops the
    `main` key entirely (see that file's header comment): the only
    Worker source left in this repo, `src/app.ts`, does not call
    `env.ASSETS.fetch`, so nothing serves an XRPC route from the assets
    Worker any more — the XRPC-enabled badge this page used to show
    would be false advertising if left `true`. The XRPC handler itself
    is preserved byte-for-byte at `src/xrpc-dispatcher.ts` (moved, not
    deleted, from `svelte/src/routes/xrpc/[...path]/+server.ts`) —
    reviving it is an undecided product decision, out of scope for this
    frontend migration.

  `public/index.html`'s inlined <style> was produced once, at authoring
  time, by `jp-go-dds.page/->page` (nbb, JVM-free) concatenating the
  vendored `dds.css` with `jp-go-dds.core/ext-css`. This namespace only
  requires `jp-go-dds.core` — the browser bundle does not need
  `jp-go-dds.page` at runtime; that is a build-time-only tool used to
  author the static shell once."
  (:require [reagent.dom :as rdom]
            [re-frame.core :as rf]
            [jp-go-dds.core :as dds]))

;; -- db ------------------------------------------------------------------
;;
;; Same nine facts + own source path that `+page.svelte`'s `app` const
;; held (title/project/name/kind/routeCount/routes/vars/xrpc/relativePath).

(def default-db
  {:app/title "Mold Allergy M0ldalg1"
   :app/project "etzhayyim-project-mold-allergy"
   :app/name "etzhayyim-wasm-mold-allergy-m0ldalg1"
   :app/kind "appview"
   :app/route-count 0
   :app/routes []
   :app/vars []
   :app/xrpc? false
   :app/relative-path "appview/etzhayyim-wasm-mold-allergy-m0ldalg1/cljs/src/mold_allergy/app.cljs"})

(rf/reg-event-db
 :initialize-db
 (fn [_ _] default-db))

(rf/reg-sub :app/title (fn [db _] (:app/title db)))
(rf/reg-sub :app/project (fn [db _] (:app/project db)))
(rf/reg-sub :app/name (fn [db _] (:app/name db)))
(rf/reg-sub :app/kind (fn [db _] (:app/kind db)))
(rf/reg-sub :app/route-count (fn [db _] (:app/route-count db)))
(rf/reg-sub :app/routes (fn [db _] (:app/routes db)))
(rf/reg-sub :app/vars (fn [db _] (:app/vars db)))
(rf/reg-sub :app/xrpc? (fn [db _] (:app/xrpc? db)))
(rf/reg-sub :app/relative-path (fn [db _] (:app/relative-path db)))

;; -- view ------------------------------------------------------------------

(defn app-view []
  (let [title         @(rf/subscribe [:app/title])
        name          @(rf/subscribe [:app/name])
        kind          @(rf/subscribe [:app/kind])
        project       @(rf/subscribe [:app/project])
        route-count   @(rf/subscribe [:app/route-count])
        routes        @(rf/subscribe [:app/routes])
        vars          @(rf/subscribe [:app/vars])
        xrpc?         @(rf/subscribe [:app/xrpc?])
        relative-path @(rf/subscribe [:app/relative-path])]
    (dds/container

     [:section {:class "dds-ext-section"}
      [:p {:class "dds-ext-lead"} (str "Cloudflare " kind)]
      (dds/heading 1 title)
      [:span {:class "dads-u-mono-16N-150"} name]]

     [:section {:class "dds-ext-section"}
      (dds/grid {:min "12rem"}
        (dds/card [:p {:class "dds-ext-lead"} "Project"] [:strong project])
        (dds/card [:p {:class "dds-ext-lead"} "Routes"] [:strong (str route-count)])
        (dds/card [:p {:class "dds-ext-lead"} "XRPC"]
                  [:strong (if xrpc? "enabled" "not configured")]))]

     [:section {:class "dds-ext-section"}
      (dds/heading 2 "Public Routes" {:size "24"})
      (if (seq routes)
        (dds/card
         (into [:ul {:class "dds-ext-stack"}]
               (map (fn [r] [:li {:class "dads-u-mono-16N-150"} r]) routes)))
        [:p {:class "dds-ext-lead"} "No public route is declared next to this app surface."])]

     [:section {:class "dds-ext-section"}
      (dds/heading 2 "Runtime Bindings" {:size "24"})
      (if (seq vars)
        (into [:div {:class "dds-ext-row"}]
              (map (fn [v] (dds/chip-label v {:color "blue"})) vars))
        [:p {:class "dds-ext-lead"} "No public vars are declared in the nearest wrangler config."])]

     [:section {:class "dds-ext-section"}
      (dds/heading 2 "Source" {:size "24"})
      [:p {:class "dads-u-mono-16N-150"} relative-path]])))

;; -- mount -------------------------------------------------------------------

(defn render []
  (rdom/render [app-view] (.getElementById js/document "app")))

(defn ^:export main []
  (rf/dispatch-sync [:initialize-db])
  (render))
