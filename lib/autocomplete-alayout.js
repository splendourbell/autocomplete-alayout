'use babel'

import { CompositeDisposable } from 'atom'
import AlayoutProvider from './alayout-provider'

export default
{
    provideAutocompleteAlayout()
    {
        this.layoutProvider = new AlayoutProvider()
        atom.workspace.observeTextEditors(editor => {
            if(editor.getFileName() && editor.getFileName().endsWith('.json'))
            {
                editor.onDidChangeCursorPosition(event => {
                    this.layoutProvider.onDidChangeCursorPosition(event);
                });

                setInterval(()=>{
                    this.layoutProvider.checkScrollPostion(editor);
                }, 1500);
            }
        });
        return this.layoutProvider
    },

    activate(state)
    {

    },

    deactivate()
    {
    },

    serialize()
    {

    }

};
